import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.dirname(here);
const generated = path.join(here, 'generated');
fs.mkdirSync(generated, { recursive: true });
const db = JSON.parse(fs.readFileSync(path.join(root, 'data/db.json'), 'utf8'));
const credentialFile = process.env.LIFESCI_ACCOUNT_FILE || path.join(here, 'private/accounts.json');
const priorCredentialFile = path.resolve(root, '../../outputs/cloudflare-accounts.json');
if (!fs.existsSync(credentialFile) && fs.existsSync(priorCredentialFile)) {
  fs.mkdirSync(path.dirname(credentialFile), { recursive: true });
  fs.copyFileSync(priorCredentialFile, credentialFile);
  fs.chmodSync(credentialFile, 0o600);
}
let accounts;
if (fs.existsSync(credentialFile)) accounts = JSON.parse(fs.readFileSync(credentialFile, 'utf8'));
else {
  accounts = db.users.map((user) => ({ username: user.username, role: user.role, password: crypto.randomBytes(24).toString('base64url') }));
  fs.mkdirSync(path.dirname(credentialFile), { recursive: true });
  fs.writeFileSync(credentialFile, JSON.stringify(accounts, null, 2), { mode: 0o600 });
}
for (const user of db.users) {
  const account = accounts.find((entry) => entry.username === user.username);
  if (!account) throw new Error('Missing account credential');
  const salt = crypto.randomBytes(16).toString('hex');
  user.passwordHash = `${salt}:${crypto.scryptSync(account.password, salt, 64).toString('hex')}`;
}
db.sessions = [];
db.meta.syncing = false;
db.meta.ophSyncing = false;
db.meta.publicMode = true;
const files = [{ path: '/lifesci/data/db.json', body: Buffer.from(JSON.stringify(db)).toString('base64') }];
function visit(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) visit(full);
    else if (entry.name.endsWith('.docx')) files.push({ path: '/lifesci/' + path.relative(root, full).split(path.sep).join('/'), body: fs.readFileSync(full).toString('base64') });
  }
}
visit(path.join(root, 'data/reports'));
fs.writeFileSync(path.join(generated, 'bootstrap.json'), JSON.stringify({ files }));

function transformServer(contents, filename) {
  contents = contents.replace(/path\.dirname\(fileURLToPath\(import\.meta\.url\)\)/g, "'/lifesci/server'");
  contents = contents.replace(/from 'node:fs'/g, `from '${path.join(here, 'storage.js')}'`);
  if (filename === 'index.js') {
    contents = contents.slice(0, contents.indexOf('app.listen(PORT,'));
    // Edge compression replaces Node's streaming compression, whose Brotli
    // stream does not reliably finish inside the Workers HTTP bridge.
    contents = contents.replace('app.use(compression());', '');
    contents = contents.replace('import { runOphDaily, retranslateAbstracts,', 'import { generateReports, runOphDaily, retranslateAbstracts,');
    contents = contents.replace('const report = await runOphDaily({ force: true });', "const report = req.query.generateOnly === '1' ? await generateReports(getDb().articles) : await runOphDaily({ force: true });");
    contents = contents.replace("res.setHeader('X-Content-Type-Options', 'nosniff');", "res.setHeader('X-Content-Type-Options', 'nosniff');\n  res.setHeader('Cache-Control', 'no-store');");
    contents = contents.replace('ensureSchema();', "ensureSchema();\nif (getDb().meta.ophSyncing) { getDb().meta.ophSyncing = false; commitNow(); }");
    contents = contents.replace('res.download(resolved, path.basename(resolved));', "res.type('application/vnd.openxmlformats-officedocument.wordprocessingml.document').attachment(path.basename(resolved)).send(fs.readFileSync(resolved));");
    contents += '\nexport { app, getDb, resetDb, commitNow, getUserByToken, pruneSessions, runOphDaily, runAutoUpdate };\n';
    contents += "export { generateReports, dateStr, journalMeta, reclassifyExisting } from './oph.js';\nexport { isValidCnTitle } from './translate.js';\nexport { parsePubMedXml } from './updater.js';\n";
    contents += "export { translateByBaidu, baiduUsable, baiduDoctor, baiduState, ensureArticleTitleCn } from './translate.js';\n";
  }
  if (filename === 'db.js') {
    contents = contents.replace("db = emptyDb();\n      }", "throw new Error('持久化数据库损坏，停止启动，等待从备份恢复');\n      }");
    contents = contents.replace(/export function commit\(\) \{[\s\S]*?\n\}/, 'export function commit() { commitNow(); }');
    contents = contents.replace("fs.writeFileSync(tmp, JSON.stringify(db, null, 2), 'utf8');", "const serialized = JSON.stringify(db, null, 2);\n  if (fs.existsSync(DATA_FILE) && fs.readFileSync(DATA_FILE, 'utf8') === serialized) return;\n  fs.writeFileSync(tmp, serialized, 'utf8');");
  }
  if (filename === 'ratelimit.js') {
    contents = contents.replace(/const cleanupTimer = setInterval\(\(\) => \{([\s\S]*?)\}, 15 \* 60 \* 1000\);\ncleanupTimer\.unref\?\.\(\);/, 'function cleanup() {$1}');
    contents = contents.replace('return (req, res, next) => {', 'return (req, res, next) => {\n    cleanup();');
  }
  if (filename === 'translate.js') {
    contents = contents.replace("import { spawn } from 'node:child_process';", `import { runBaidu } from '${path.join(here, 'baidu.js')}';`);
    const start = contents.indexOf('function resolveTransBin()');
    const end = contents.indexOf('// 百度通道当前是否可用', start);
    contents = contents.slice(0, start) + "function resolveTransBin() { return 'Cloudflare HTTP API'; }\nconst runTrans = runBaidu;\n\n" + contents.slice(end);
    contents = contents.replace("r.code === 'NETWORK_ERROR') {", "(r.code === 'NETWORK_ERROR' || r.code === 'TIMEOUT')) {");
    contents = contents.replace("if (!t) break; // 失败或已标记不可用，交给兜底通道", "if (!t) return ''; // 禁止把部分译文当作完整成功");
    contents = contents.replace('article.titleCn = cn;', "if (article.titleCn && article.titleCn !== cn) article.titleCnPrev = article.titleCn;\n    article.titleCn = cn;");
    contents = contents.replace("article.titleCn = '';", "// 重译失败保留已有译文\n  if (!article.titleCn) article.titleCn = '';");
    contents = contents.replace('return out.join(\'\').trim();\n}', "return out.length === chunks.length ? out.join('').trim() : '';\n}");
    contents = contents.replace("const myMemoryState = { exhausted: false, message: '' };", "const myMemoryState = { exhausted: false, message: '', resetAt: 0 };\nfunction recoverMyMemory() { if (myMemoryState.exhausted && Date.now() >= myMemoryState.resetAt) { myMemoryState.exhausted = false; myMemoryState.message = ''; } }");
    contents = contents.replace("myMemoryState.exhausted = true;", "myMemoryState.exhausted = true;\n    myMemoryState.resetAt = Date.now() + 24 * 3600 * 1000;");
    contents = contents.replace("if (myMemoryState.exhausted) return '';", "recoverMyMemory();\n  if (myMemoryState.exhausted) return '';");
    contents = contents.replace('if (norm(t) === norm(original)) return false;', "if (t.toLowerCase() === String(original || '').trim().toLowerCase()) return false;");
    contents = contents.replace('export async function translateCn(text) {', 'async function translateCnNow(text) {');
    contents = contents.replace("translateCn(String(article.title || '').slice(0, 300))", "translateCn(String(article.title || '').slice(0, 300), { force })");
    contents += `
let translationQueue = Promise.resolve();
let translationCache;
const translationCacheFile = path.join(PROJECT_ROOT, 'data', 'translation-cache.json');
export function translateCn(text, { force = false } = {}) {
  const job = translationQueue.then(async () => {
    if (!translationCache) {
      translationCache = {};
      if (fs.existsSync(translationCacheFile)) translationCache = JSON.parse(fs.readFileSync(translationCacheFile, 'utf8'));
    }
    const key = JSON.stringify(['en', 'zh', String(text), 'v1']);
    if (!force && translationCache[key]) {
      providerState.last = translationCache[key].provider;
      return translationCache[key].translated;
    }
    providerState.last = '';
    const translated = await translateCnNow(text);
    if (isValidCnTitle(translated, text)) {
      translationCache[key] = { translated, provider: providerState.last };
      const keys = Object.keys(translationCache);
      for (const old of keys.slice(0, Math.max(0, keys.length - 5000))) delete translationCache[old];
      fs.writeFileSync(translationCacheFile, JSON.stringify(translationCache), 'utf8');
    }
    return translated;
  });
  translationQueue = job.catch(() => {});
  return job;
}
`;
  }
  if (filename === 'oph.js') {
    contents = contents.replace(/export function dateStr\(d = new Date\(\)\) \{[\s\S]*?\n\}/, "export function dateStr(d = new Date()) { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d); }");
    contents = contents.replace("if (!a.doi || db.articles.some((x) => x.doi === a.doi)) continue;", "if (!a.doi || db.articles.some((x) => x.doi === a.doi)) continue;\n    if (!a.publicationDate || a.publicationDate !== dateStr()) continue;");
    contents = contents.replace('publishedAt: a.date,', 'publishedAt: a.date,\n      publicationDate: a.publicationDate,');
    contents = contents.replace('function genDocx(sections, extended, kind) {\n  const day = dateStr();', 'function genDocx(sections, extended, kind, day, incomplete) {');
    contents = contents.replace('export async function generateReports(articles) {\n  const day = dateStr();', 'export async function generateReports(articles, { day = dateStr(), incomplete = false } = {}) {');
    contents = contents.replace('const { sections, extended } = buildSections(articles);', "const daily = articles.filter((a) => a.publicationDate ? a.publicationDate === day : a.publishedAt && dateStr(new Date(a.publishedAt)) === day);\n  const { sections, extended } = buildSections(daily);");
    contents = contents.replace('genDocx(sections, extended, t.kind)', 'genDocx(sections, extended, t.kind, day, incomplete)');
    contents = contents.replace('function journalSection(journal, items)', 'function journalSection(journal, items, incomplete)');
    contents = contents.replace("txt('本刊今日暂无眼科 AI 相关论文。'", "txt(incomplete ? '本次采集未完成，暂无法确认本刊今日是否有新论文。' : '本刊今日暂无眼科 AI 相关论文。'");
    contents = contents.replace('journalSection(j, j.items)', 'journalSection(j, j.items, incomplete)');
    contents = contents.replace("txt('今日暂无其他期刊的眼科 AI 论文。'", "txt(incomplete ? '扩展推荐采集未完成，今日数据可能不完整。' : '今日暂无其他期刊的眼科 AI 论文。'");
    contents = contents.replace("  for (const sec of sections) {", "  if (incomplete) children.push(txt('采集状态：部分数据源暂不可用，本日报可能不完整；请稍后重试采集。', { color: 'C00000', size: 22 }));\n  for (const sec of sections) {");
    contents = contents.replace('本文件用于网站「眼科AI」模块内容发布。如需转载请联系编辑组。', '本文件用于网站「眼科AI」模块内容发布。如需转载请联系编辑组。影响因子为参考值，以期刊官方为准。');
    contents = contents.replace('generateReports(db.articles)', 'generateReports(db.articles, { day, incomplete: result.errors.length > 0 })');
    contents = contents.replace('const t = await syncTargetJournals();\n    const e = await syncExtended();\n    result.targetAdded = t.added;\n    result.extendedAdded = e.added;', "try { result.targetAdded = (await syncTargetJournals()).added; } catch (error) { result.errors.push('目标期刊：' + error.message); }\n    try { result.extendedAdded = (await syncExtended()).added; } catch (error) { result.errors.push('扩展推荐：' + error.message); }\n    result.complete = result.errors.length === 0;");
    contents = contents.replace('translateCn(absEn.slice(0, 1500))', 'translateCn(absEn.slice(0, 1500), { force: true })');
    contents = contents.replace('if (db.meta?.ophSyncing && !force)', 'if (db.meta?.ophSyncing)');
    contents = contents.replace("a.content = `【中文摘要】（百度翻译，仅供参考）", "a.content = `【中文摘要】（${providerState.last === 'baidu' ? '百度翻译' : '机器翻译'}，仅供参考）");
    contents = contents.replace("const meta = journalMeta(a.journal);\n    if (meta.target)", "const before = { journal: a.journal, impactFactorRef: a.impactFactorRef, journalGroup: a.journalGroup, ophTier: a.ophTier };\n    const meta = journalMeta(a.journal);\n    if (meta.target)");
    contents = contents.replace('updated++;\n    }\n  }\n  commit();', "updated++;\n    }\n    for (const [key, value] of Object.entries(before)) if (value !== undefined && value !== a[key]) a[key + 'Prev'] = value;\n  }\n  commit();");
  }
  if (filename === 'updater.js') {
    contents = contents.replace(/export async function fetchText\(url\) \{[\s\S]*?\n\}/, "export { fetchText } from '../cloudflare/fetch-text.js';\nimport { fetchText } from '../cloudflare/fetch-text.js';");
    contents = contents.replace('let date = new Date().toISOString();', "let publicationDate = '';\n    let date = new Date().toISOString();");
    contents = contents.replace('date = dt.toISOString();', "date = dt.toISOString();\n        if (mo && da) publicationDate = `${y[1]}-${String(month).padStart(2, '0')}-${String(Number(da[1])).padStart(2, '0')}`;");
    contents = contents.replace('date,\n      journal:', 'date,\n      publicationDate,\n      journal:');
  }
  return contents;
}

await build({
  entryPoints: [path.join(root, 'server/index.js')], outfile: path.join(generated, 'app.js'), bundle: true,
  format: 'esm', platform: 'node', target: 'es2022', mainFields: ['module', 'main'],
  banner: { js: "import { createRequire as workerCreateRequire } from 'node:module'; const require = workerCreateRequire('/lifesci/cloudflare/app.js');" },
  external: ['node:*', 'cloudflare:*', path.join(here, 'storage.js')],
  plugins: [{ name: 'cloudflare-adapter', setup(builder) {
    builder.onResolve({ filter: /^depd$/ }, () => ({ path: path.join(here, 'depd.cjs') }));
    builder.onLoad({ filter: /\/server\/[^/]+\.js$/ }, (args) => ({ contents: transformServer(fs.readFileSync(args.path, 'utf8'), path.basename(args.path)), loader: 'js', resolveDir: path.dirname(args.path) }));
  } }]
});
const compiledPath = path.join(generated, 'app.js');
fs.writeFileSync(compiledPath, fs.readFileSync(compiledPath, 'utf8').replaceAll(path.join(here, 'storage.js'), '../storage.js'));
console.log(JSON.stringify({ articles: db.articles.length, reports: files.length - 1, credentials: credentialFile, cloudBackend: path.join(generated, 'app.js') }));
