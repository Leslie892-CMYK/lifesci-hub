import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFile } from 'node:fs/promises';
import { attachStorage, mkdirSync, writeFileSync, readFileSync, renameSync, unlinkSync, readdirSync } from './storage.js';
import { createTextFetcher } from './fetch-text.js';

function memoryStorage() {
  const db = new DatabaseSync(':memory:');
  return {
    sql: { exec(query, ...values) {
      const stmt = db.prepare(query);
      const rows = stmt.columns().length ? stmt.all(...values) : (stmt.run(...values), []);
      return { toArray: () => rows };
    } },
    transactionSync(fn) {
      db.exec('BEGIN');
      try { const result = fn(); db.exec('COMMIT'); return result; }
      catch (error) { db.exec('ROLLBACK'); throw error; }
    }
  };
}

test('SQLite-backed file storage survives cache reset and atomic replacement for multi-chunk files', () => {
  const store = memoryStorage();
  attachStorage(store);
  const big = Buffer.alloc(800000, 7);
  writeFileSync('/data/db.json', big);
  attachStorage(store);
  assert.deepEqual(readFileSync('/data/db.json'), big);
  writeFileSync('/data/db.json.tmp', 'replacement');
  renameSync('/data/db.json.tmp', '/data/db.json');
  attachStorage(store);
  assert.equal(readFileSync('/data/db.json', 'utf8'), 'replacement');
  assert.deepEqual(readdirSync('/data'), ['db.json']);
});

test('Chinese report filenames and missing files remain distinguishable', () => {
  attachStorage(memoryStorage());
  mkdirSync('/data/reports/2026-10-12', { recursive: true });
  writeFileSync('/data/reports/2026-10-12/公众号稿.docx', Buffer.from([80, 75, 3, 4]));
  assert.deepEqual(readdirSync('/data/reports'), ['2026-10-12']);
  assert.deepEqual(readdirSync('/data/reports/2026-10-12'), ['公众号稿.docx']);
  unlinkSync('/data/reports/2026-10-12/公众号稿.docx');
  assert.throws(() => readFileSync('/data/reports/2026-10-12/公众号稿.docx'), { code: 'ENOENT' });
});

test('core journal classification and report generation preserve history and exclude old publications', async () => {
  attachStorage(memoryStorage());
  const bootstrap = JSON.parse(await readFile(new URL('./generated/bootstrap.json', import.meta.url), 'utf8'));
  for (const file of bootstrap.files) writeFileSync(file.path, Buffer.from(file.body, 'base64'));
  const backend = await import('./generated/app.js');
  const initialDb = JSON.parse(Buffer.from(bootstrap.files.find((file) => file.path === '/lifesci/data/db.json').body, 'base64').toString());
  assert.equal(backend.getDb().articles.length, initialDb.articles.length);
  for (const title of ['Advanced Science', 'GeroScience', 'British Journal of Ophthalmology', 'American Journal of Ophthalmology', 'Ophthalmology Science']) assert.equal(backend.journalMeta(title).target, false, title);
  assert.equal(backend.journalMeta('Science (New York, N.Y.)').journal, 'Science');
  const originals = backend.getDb().articles.map((article) => [article.id, article.title]);
  backend.reclassifyExisting();
  assert.deepEqual(backend.getDb().articles.map((article) => [article.id, article.title]), originals);
  assert.equal(backend.dateStr(new Date('2026-10-11T16:01:00Z')), '2026-10-12');
  assert.equal(backend.isValidCnTitle('MYMEMORY WARNING', 'Hello'), false);
  assert.equal(backend.isValidCnTitle('人工智能研究', 'Artificial intelligence research'), true);
  const articles = [
    { title: 'TODAY_PAPER', titleCn: '今日研究', journal: 'Nature', ophTier: 'primary', tags: ['眼科AI'], publishedAt: '2026-10-12T00:00:00Z', content: '【中文摘要】（百度翻译，仅供参考）\n中文测试摘要\n\n【英文摘要原文】\nEnglish test abstract', doi: 'test/today' },
    { title: 'OLD_PAPER', journal: 'Nature', ophTier: 'primary', tags: ['眼科AI'], publishedAt: '2026-10-10T00:00:00Z', content: '' }
  ];
  await backend.generateReports(articles, { day: '2026-10-12' });
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(readFileSync('/lifesci/data/reports/2026-10-12/公众号稿.docx'));
  const xml = await zip.file('word/document.xml').async('string');
  assert.match(xml, /TODAY_PAPER/);
  assert.match(xml, /中文测试摘要/);
  assert.doesNotMatch(xml, /OLD_PAPER/);
  assert.match(xml, /本刊今日暂无眼科 AI 相关论文/);
});

test('Baidu partial failure returns no partial translation, recovers its block and preserves an existing title', async () => {
  const backend = await import('./generated/app.js');
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.TRANS_API_KEY;
  const originalNow = Date.now;
  let calls = 0;
  process.env.TRANS_API_KEY = 'test-only-not-a-real-key';
  try {
    globalThis.fetch = async () => {
      calls++;
      return calls === 1 ? Response.json({ trans_result: [{ dst: '中文测试' }] }) : Response.json({ error_code: '52003' }, { status: 401 });
    };
    assert.equal(await backend.translateByBaidu('X'.repeat(1900)), '');
    assert.equal(calls, 2);
    assert.equal(backend.baiduUsable(), false);
    Date.now = () => originalNow() + 31 * 60 * 1000;
    assert.equal(backend.baiduUsable(), true);
    Date.now = originalNow;
    globalThis.fetch = async () => Response.json({ error_code: '52003' }, { status: 401 });
    const article = { title: 'English title', titleCn: '已有有效中文标题' };
    // MyMemory must also fail without consuming any real network quota.
    globalThis.fetch = async (url) => String(url).includes('mymemory') ? Response.json({ responseData: { translatedText: '' } }) : Response.json({ error_code: '52003' }, { status: 401 });
    await backend.ensureArticleTitleCn(article, { force: true });
    assert.equal(article.titleCn, '已有有效中文标题');
    assert.ok(article.titleCnFailedAt);
    assert.equal(backend.isValidCnTitle('人工智能 AI', 'AI'), true);
  } finally {
    globalThis.fetch = originalFetch;
    Date.now = originalNow;
    if (originalKey === undefined) delete process.env.TRANS_API_KEY;
    else process.env.TRANS_API_KEY = originalKey;
  }
});

test('NCBI transient failures retry at a paced rate and sustained throttling enters a cooldown', async () => {
  let clock = 10000;
  let calls = 0;
  const waits = [];
  const fetchText = createTextFetcher({ now: () => clock, random: () => 0, wait: async (ms) => { waits.push(ms); clock += ms; }, request: async () => ++calls === 1 ? new Response('limited', { status: 429, headers: { 'Retry-After': '3' } }) : new Response('<Id>123</Id>') });
  assert.equal(await fetchText('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi'), '<Id>123</Id>');
  assert.equal(calls, 2);
  assert.ok(waits.includes(3000));
  await fetchText('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi');
  assert.ok(waits.includes(550));
  calls = 0;
  const limited = createTextFetcher({ now: () => clock, random: () => 0, wait: async (ms) => { clock += ms; }, request: async () => { calls++; return new Response('', { status: 429 }); } });
  await assert.rejects(limited('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi'), /HTTP 429/);
  assert.equal(calls, 4);
  await assert.rejects(limited('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi'), /冷却/);
  assert.equal(calls, 4);
  clock += 300001;
  await assert.rejects(limited('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi'), /HTTP 429/);
  assert.equal(calls, 8);
});

test('daily source failures still generate both reports with explicit incomplete-data notices', async () => {
  const backend = await import('./generated/app.js');
  const snapshot = structuredClone(backend.getDb());
  const originalFetch = globalThis.fetch;
  try {
    for (const article of backend.getDb().articles) if (!article.titleCn) article.titleCn = '测试已有中文标题';
    globalThis.fetch = async (url) => {
      assert.match(String(url), /eutils\.ncbi\.nlm\.nih\.gov/);
      return new Response('<ERROR>test failure</ERROR>');
    };
    const report = await backend.runOphDaily({ force: true });
    assert.equal(report.complete, false);
    assert.equal(report.errors.length, 2);
    assert.equal(report.files.length, 2);
    assert.equal(backend.getDb().meta.ophSyncing, false);
    const JSZip = (await import('jszip')).default;
    for (const file of report.files) {
      const zip = await JSZip.loadAsync(readFileSync('/lifesci/data/reports/' + file.path));
      const xml = await zip.file('word/document.xml').async('string');
      assert.match(xml, /本日报可能不完整/);
      assert.doesNotMatch(xml, /本刊今日暂无眼科 AI 相关论文/);
    }
  } finally { globalThis.fetch = originalFetch; backend.resetDb(snapshot); }
});
