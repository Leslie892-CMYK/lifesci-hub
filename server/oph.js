// 眼科 AI 日报模块（目标期刊：19 本，按 4 组组织）
// 配置依据：《眼科期刊.docx》横向分隔线以上部分（分隔线位于 Progress in Retinal and Eye Research 之后）
// 说明：文档中的影响因子为参考值（非实时数据），界面与文档中均标注 ≈ 与"以官方为准"
//
// 功能：
// 1) 每日 8:00 自动检索「目标 19 本期刊 × 眼科 × AI」（保留原有眼科 AI 主题筛选，不等于收录这些期刊的全部文章）
// 2) 其他期刊的同主题论文作为「扩展推荐」，不删除任何历史数据
// 3) 每篇论文生成中文标题（titleCn，机器翻译；失败时前端回退英文原题并标注状态）
// 4) 生成公众号版 / 网站介绍版 docx：按「分组 → 期刊」分区展示，无文章的期刊给出明确空状态
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  ExternalHyperlink
} from 'docx';
import { getDb, commit, nextId } from './db.js';
import { fetchText, parsePubMedXml } from './updater.js';
import { translateCn, isValidCnTitle, ensureArticleTitleCn, quotaState, providerState } from './translate.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REPORTS_DIR = path.join(__dirname, '..', 'data', 'reports');

// ---------- 目标期刊（19 本，分隔线以上） ----------
export const OPH_JOURNAL_GROUPS = [
  {
    name: 'CNS 正刊',
    journals: [
      { label: 'Nature', ta: 'Nature', aliases: ['Nature'], ifRef: 56.1 },
      { label: 'Science', ta: 'Science', aliases: ['Science'], ifRef: 47.3 },
      { label: 'Cell', ta: 'Cell', aliases: ['Cell'], ifRef: 43 }
    ]
  },
  {
    name: '综合类子刊',
    journals: [
      { label: 'Nature Medicine', ta: 'Nat Med', aliases: ['Nature medicine'], ifRef: 52.5 },
      { label: 'Nature Biomedical Engineering', ta: 'Nat Biomed Eng', aliases: ['Nature biomedical engineering'], ifRef: 26.5 },
      { label: 'Nature Machine Intelligence', ta: 'Nat Mach Intell', aliases: ['Nature machine intelligence'], ifRef: 29.8 },
      { label: 'Nature Communications', ta: 'Nat Commun', aliases: ['Nature communications'], ifRef: 18.1 },
      { label: 'Science Translational Medicine', ta: 'Sci Transl Med', aliases: ['Science translational medicine'], ifRef: 15.6 },
      { label: 'Science Advances', ta: 'Sci Adv', aliases: ['Science advances'], ifRef: 13.9 },
      { label: 'Cell Reports Medicine', ta: 'Cell Rep Med', aliases: ['Cell reports. Medicine', 'Cell reports medicine'], ifRef: 10.6 }
    ]
  },
  {
    name: '医学综合与数字健康',
    journals: [
      { label: 'The Lancet Digital Health', ta: 'Lancet Digit Health', aliases: ['Lancet digital health', 'The Lancet. Digital health'], ifRef: 25.5 },
      { label: 'npj Digital Medicine', ta: 'NPJ Digit Med', aliases: ['NPJ digital medicine'], ifRef: 18.0 },
      { label: 'eClinicalMedicine', ta: 'EClinicalMedicine', aliases: ['eClinicalMedicine'], ifRef: 12.8 },
      { label: 'JAMA Network Open', ta: 'JAMA Netw Open', aliases: ['JAMA network open'], ifRef: null },
      { label: 'Journal of Medical Internet Research', ta: 'J Med Internet Res', aliases: ['Journal of medical Internet research'], ifRef: 8.2 },
      { label: 'JAMIA', ta: 'J Am Med Inform Assoc', aliases: ['Journal of the American Medical Informatics Association', 'JAMIA'], ifRef: null }
    ]
  },
  {
    name: '眼科专科顶刊',
    journals: [
      { label: 'Ophthalmology', ta: 'Ophthalmology', aliases: ['Ophthalmology'], ifRef: 10.9 },
      { label: 'JAMA Ophthalmology', ta: 'JAMA Ophthalmol', aliases: ['JAMA ophthalmology'], ifRef: 9.2 },
      { label: 'Progress in Retinal and Eye Research', ta: 'Prog Retin Eye Res', aliases: ['Progress in retinal and eye research'], ifRef: 16.2 }
    ]
  }
];

export const OPH_JOURNALS = OPH_JOURNAL_GROUPS.flatMap((g) => g.journals);

export const OPH_JOURNAL_INDEX = (() => {
  const idx = {};
  for (const g of OPH_JOURNAL_GROUPS) {
    for (const j of g.journals) idx[j.label] = { group: g.name, label: j.label, ta: j.ta, ifRef: j.ifRef ?? null };
  }
  return idx;
})();

function norm(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

// 归一化为「单词序列」（用于按词边界匹配，避免 GeroScience/Advanced Science 命中 Science）
function normWords(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

// 长名优先匹配；
// 单词刊名（Nature / Science / Cell / Ophthalmology / eClinicalMedicine / JAMIA）只允许精确匹配，
// 其余长刊名按「整词边界」包含匹配（如 "Nature medicine (New York, N.Y.)" 命中 Nature Medicine）。
const MATCH_ORDER = [...OPH_JOURNALS].sort((a, b) => norm(b.label).length - norm(a.label).length);
const EXACT_ONLY = new Set(OPH_JOURNALS.filter((j) => !/\s/.test(j.label)).map((j) => j.label));

function hitsAlias(rawWords, alias) {
  const a = normWords(alias);
  if (!a) return false;
  return ` ${rawWords} `.includes(` ${a} `); // 整词边界，避免子串误判
}

export function journalMeta(raw) {
  const r = norm(raw);
  const rw = normWords(raw);
  const rawLc = String(raw || '').toLowerCase().replace(/\s+/g, ' ').trim();
  if (!r) return { journal: '其他', impactFactor: null, target: false, group: null };
  for (const j of MATCH_ORDER) {
    // 精确匹配；单词刊名额外允许 PubMed 的限定写法，如 "Science (New York, N.Y.)" / "Ophthalmology (Rochester, Minn.)"
    const exact = r === norm(j.label);
    const qualified = EXACT_ONLY.has(j.label) && rawLc.startsWith(`${String(j.label).toLowerCase()} (`);
    if (exact || qualified) {
      return { journal: j.label, impactFactor: j.ifRef ?? null, target: true, group: OPH_JOURNAL_INDEX[j.label].group };
    }
  }
  for (const j of MATCH_ORDER) {
    if (EXACT_ONLY.has(j.label)) continue; // 单词刊名不做包含匹配，防止误判
    if (j.aliases.some((al) => hitsAlias(rw, al))) {
      return { journal: j.label, impactFactor: j.ifRef ?? null, target: true, group: OPH_JOURNAL_INDEX[j.label].group };
    }
  }
  return { journal: String(raw || '其他'), impactFactor: null, target: false, group: null };
}

export const OPH_AI_TERMS =
  '(artificial intelligence[tiab] OR "deep learning"[tiab] OR "machine learning"[tiab] OR "large language model"[tiab] OR "foundation model"[tiab] OR "computer vision"[tiab] OR "neural network"[tiab] OR ChatGPT[tiab] OR "reinforcement learning"[tiab] OR "transfer learning"[tiab])';
export const OPH_DOMAIN_TERMS =
  '(ophthalmolog*[tiab] OR retina[tiab] OR glaucoma[tiab] OR "diabetic retinopathy"[tiab] OR cataract[tiab] OR cornea[tiab] OR uveitis[tiab] OR "optic nerve"[tiab] OR fundus[tiab] OR intraocular[tiab] OR myopia[tiab] OR "age-related macular"[tiab])';
export const OPH_LOOKBACK_DAYS = Number(process.env.OPH_LOOKBACK_DAYS) || 1; // 默认只收当天发表
export const OPH_MAX_ITEMS = 30;
export const OPH_EXT_MAX_ITEMS = 12;
export const OPH_BACKFILL_MAX = Number(process.env.OPH_BACKFILL_MAX) || 10; // 每轮补翻译的历史中文标题上限
export const OPH_TAG = '眼科AI';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function buildTargetQuery() {
  const journals = OPH_JOURNALS.map((j) => `"${j.ta}"[ta]`).join(' OR ');
  return `${OPH_AI_TERMS} AND ${OPH_DOMAIN_TERMS} AND (${journals})`;
}

export function dateStr(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// 翻译能力来自 ./translate.js（与全站共用）
export { translateCn, isValidCnTitle };
export const ensureTitleCn = ensureArticleTitleCn;

async function fetchAndStore({ query, retmax, limit }) {
  const db = getDb();
  const esearch = await fetchText(
    `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}` +
      `&reldate=${OPH_LOOKBACK_DAYS}&datetype=pdat&retmax=${retmax}`
  );
  const ids = [...esearch.matchAll(/<Id>(\d+)<\/Id>/g)].map((m) => m[1]);
  if (!ids.length) return { added: 0, found: 0 };

  await sleep(400);
  const efetch = await fetchText(
    `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${ids.join(',')}&rettype=abstract&retmode=xml`
  );
  const arts = parsePubMedXml(efetch, '');

  let added = 0;
  for (const a of arts) {
    if (!a.doi || db.articles.some((x) => x.doi === a.doi)) continue;
    const meta = journalMeta(a.journal);
    const absEn = a.abstract || '';
    const absCn = await translateCn(absEn.slice(0, 1200));
    await sleep(200);
    const rawTitleCn = await translateCn(String(a.title || '').slice(0, 300));
    await sleep(200);
    const journalName = meta.target ? meta.journal : String(a.journal || '其他');

    db.articles.push({
      id: nextId(),
      title: a.title,
      titleCn: isValidCnTitle(rawTitleCn, a.title) ? rawTitleCn : '',
      summary: (absCn || absEn || `《${journalName}》眼科 AI 领域最新研究论文。`).slice(0, 300),
      content: [
        `${absCn ? `【中文摘要】（机器翻译，仅供参考）\n${absCn}` : '【中文摘要】（机器翻译暂不可用，请参考英文原文）'}`,
        `【英文摘要原文】\n${absEn || '暂无摘要'}`,
        `原文链接：https://doi.org/${a.doi}${a.pmc ? `\nPMC 全文：https://www.ncbi.nlm.nih.gov/pmc/articles/${a.pmc}/` : ''}`
      ].join('\n\n'),
      category: 'journal',
      journal: journalName,
      impactFactorRef: meta.target ? meta.impactFactor : null,
      journalGroup: meta.target ? meta.group : null,
      pmc: a.pmc || '',
      ophTier: meta.target ? 'primary' : 'secondary',
      authors: a.authors,
      doi: a.doi,
      tags: [OPH_TAG, meta.target ? '目标期刊' : '扩展推荐', journalName],
      publishedAt: a.date,
      authorId: null,
      views: 0,
      source: 'auto-oph'
    });
    added++;
    if (added >= limit) break;
  }
  commit();
  return { added, found: arts.length };
}

// ---------- 检索与入库 ----------
export async function syncTargetJournals() {
  return fetchAndStore({ query: buildTargetQuery(), retmax: OPH_MAX_ITEMS, limit: 20 });
}

export async function syncExtended() {
  return fetchAndStore({
    query: `${OPH_AI_TERMS} AND ${OPH_DOMAIN_TERMS}`,
    retmax: OPH_EXT_MAX_ITEMS,
    limit: OPH_EXT_MAX_ITEMS
  });
}

// 中文摘要重译：早期摘要由 MyMemory 机翻，专业术语错误较多（如 wavelength → 波ngth、
// multimodal agent → 多式联运AI药剂）。改用百度翻译重译，英文摘要原文始终原样保留，
// 旧中文摘要存入 abstractCnPrev 以便追溯。
//   limit      本次最多处理篇数
//   charBudget 本次最多消耗的翻译字符数（防止一次性耗尽月度额度）
export async function retranslateAbstracts(limit = 10, { charBudget = 60000, primaryOnly = false, force = false } = {}) {
  const db = getDb();
  const list = db.articles
    .filter((a) => a.source === 'auto-oph' && String(a.content || '').includes('【英文摘要原文】'))
    .filter((a) => (primaryOnly ? a.ophTier === 'primary' : true))
    .filter((a) => (force ? true : !a.abstractCnAt)) // 已重译过的跳过，避免重复消耗翻译额度
    .sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt)));
  let ok = 0;
  let fail = 0;
  let used = 0;
  for (const a of list.slice(0, limit)) {
    const content = String(a.content || '');
    const [cnPart, enPartRaw] = content.split('【英文摘要原文】');
    const enPart = String(enPartRaw || '');
    const absEn = enPart.split('原文链接')[0].trim();
    if (!absEn || absEn === '暂无摘要') { fail++; continue; }
    const budgetNeed = Math.min(absEn.length, 1500);
    if (used + budgetNeed > charBudget) break; // 超出本次预算，留到下一轮
    const cn = await translateCn(absEn.slice(0, 1500));
    used += budgetNeed;
    if (!isValidCnTitle(cn, absEn)) { fail++; continue; } // 复用同一套有效性校验（必须有中文、非原样返回）
    const oldCn = String(cnPart || '').replace(/【中文摘要】[^\n]*\n?/, '').trim();
    if (oldCn) a.abstractCnPrev = oldCn;       // 保留旧译文
    const linkTail = enPart.includes('原文链接') ? enPart.slice(enPart.indexOf('原文链接')).trim() : '';
    a.content = `【中文摘要】（百度翻译，仅供参考）\n${cn}\n\n【英文摘要原文】\n${absEn}${linkTail ? `\n\n${linkTail}` : ''}`;
    a.abstractCnAt = new Date().toISOString();
    a.abstractCnProvider = providerState.last;
    ok++;
    await sleep(providerState.last === 'baidu' ? 60 : 200);
    if ((ok + fail) % 5 === 0) commit();
  }
  if (ok || fail) commit();
  return { total: list.length, ok, fail, chars: used, exhausted: quotaState.exhausted };
}

// 非破坏性迁移：重算已有论文的期刊归属与分组（不删除任何历史数据）
export function reclassifyExisting() {
  const db = getDb();
  let updated = 0;
  for (const a of db.articles) {
    if (a.source !== 'auto-oph') continue;
    const meta = journalMeta(a.journal);
    if (meta.target) {
      a.journal = meta.journal;
      a.impactFactorRef = meta.impactFactor;
      a.journalGroup = meta.group;
    } else {
      // 早期误判遗留的派生字段（分组/影响因子）一并清理，避免扩展推荐里显示错误分组
      if (a.journalGroup !== undefined) delete a.journalGroup;
      if (a.impactFactorRef !== undefined) delete a.impactFactorRef;
    }
    const tier = meta.target ? 'primary' : 'secondary';
    if (a.ophTier !== tier) {
      a.ophTier = tier;
      updated++;
    }
  }
  commit();
  return updated;
}

// ---------- DOCX ----------
function txt(text, opts = {}) {
  return new Paragraph({
    children: [new TextRun({ text, size: 22, font: 'Calibri', ...opts })],
    spacing: { after: 120 }
  });
}

function heading(text, level = HeadingLevel.HEADING_2) {
  const size = level === HeadingLevel.HEADING_1 ? 32 : level === HeadingLevel.HEADING_2 ? 26 : 23;
  return new Paragraph({
    heading: level,
    children: [new TextRun({ text, bold: true, size, font: 'Calibri' })],
    spacing: { before: 240, after: 120 }
  });
}

function link(text, url) {
  return new Paragraph({
    children: [
      new ExternalHyperlink({
        link: url,
        children: [new TextRun({ text, color: '0563C1', underline: {}, size: 20, font: 'Calibri' })]
      })
    ],
    spacing: { after: 80 }
  });
}

function paperBlocks(items) {
  const blocks = [];
  for (const a of items) {
    const ifText = a.impactFactorRef ? `（IF ≈${a.impactFactorRef}，参考值）` : '';
    blocks.push(heading(`${(a.publishedAt || '').slice(0, 10)}${ifText}`, HeadingLevel.HEADING_3));
    if (a.titleCn) {
      blocks.push(txt(a.titleCn, { bold: true, size: 26 }));
      blocks.push(txt(`英文原题：${a.title}`, { size: 19, italics: true, color: '595959' }));
    } else {
      blocks.push(txt(a.title, { bold: true, size: 24 }));
      blocks.push(txt('（中文标题翻译暂不可用，已保留英文原题）', { size: 18, italics: true, color: 'C00000' }));
    }
    if (a.authors) blocks.push(txt(`作者：${a.authors}`, { size: 18 }));
    // 兼容两种表头：【中文摘要】（机器翻译，仅供参考）与【中文摘要】（百度翻译，仅供参考）
    const cnMatch = String(a.content || '').match(/【中文摘要】(（[^）]*）)?\s*\n?([\s\S]*?)\s*【英文摘要原文】/);
    const cnHeader = cnMatch?.[1] ? `（${cnMatch[1].replace(/[（）]/g, '')}）` : '（机器翻译，仅供参考）';
    const absCnRaw = (cnMatch?.[2] || '').trim();
    const absCn = /翻译(暂不可用|不可用)/.test(absCnRaw) ? '' : absCnRaw.slice(0, 500); // 占位提示不算有效译文
    const absEn = String(a.content || '').split('【英文摘要原文】')[1]?.split('原文链接')[0]?.trim().slice(0, 500);
    if (absCn) blocks.push(txt(`【中文摘要】${cnHeader}\n${absCn}`, { size: 20 }));
    else blocks.push(txt('【中文摘要】翻译暂不可用，请参考英文原文。', { size: 20 }));
    if (absEn) blocks.push(txt(`【English Abstract】\n${absEn}`, { size: 20 }));
    if (a.doi) blocks.push(link(`✅ 原文（DOI: ${a.doi}）`, `https://doi.org/${a.doi}`));
    if (a.pmc) blocks.push(link('📄 PMC 全文链接', `https://www.ncbi.nlm.nih.gov/pmc/articles/${a.pmc}/`));
  }
  return blocks;
}

function journalSection(journal, items) {
  const blocks = [heading(`${journal.label}（${items.length} 篇）`)];
  if (items.length === 0) {
    blocks.push(txt('本刊今日暂无眼科 AI 相关论文。', { size: 20, italics: true, color: '808080' }));
    return blocks;
  }
  blocks.push(...paperBlocks(items));
  return blocks;
}

function genDocx(sections, extended, kind) {
  const day = dateStr();
  const isMp = kind === 'mp';
  const title = isMp ? `今日眼科AI速递（${day}）` : `眼科AI 论文介绍（${day}）`;
  const journalLine = OPH_JOURNALS.map((j) => j.label).join('、');
  const children = [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: title, bold: true, size: 32, font: 'Calibri' })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 }
    }),
    ...(isMp
      ? [
          txt(`本文由【生命科学前沿 · 眼科AI 日报】自动整理，收录 ${day} 当天发表的眼科 AI 论文（目标期刊 19 本）。`, { size: 20, italics: true }),
          txt(`目标期刊：${journalLine}。`, { size: 20, italics: true }),
          txt('每篇含「中文标题 + 英文原题」「中文摘要 + English Abstract」与原文/PMC 全文链接。影响因子为参考值，以官方为准。', { size: 20, italics: true })
        ]
      : [txt('本文件用于网站「眼科AI」模块内容发布。如需转载请联系编辑组。', { size: 20, italics: true })])
  ];

  for (const sec of sections) {
    children.push(heading(sec.group, HeadingLevel.HEADING_2));
    for (const j of sec.journals) children.push(...journalSection(j, j.items));
  }

  children.push(heading('扩展推荐 · 非目标期刊（仅供参考）', HeadingLevel.HEADING_2));
  if (extended.length === 0) {
    children.push(txt('今日暂无其他期刊的眼科 AI 论文。', { size: 20, italics: true, color: '808080' }));
  } else {
    for (const j of extended) children.push(...journalSection(j, j.items));
  }

  return new Document({
    sections: [{ properties: {}, children }],
    styles: { default: { document: { run: { font: 'Calibri', size: 22 } } } }
  });
}

// 组织分区数据：目标期刊按 组 → 刊（含空状态）；扩展推荐按刊（仅非空）
export function buildSections(articles) {
  const oph = articles.filter((a) => (a.tags || []).includes(OPH_TAG));
  const target = oph.filter((a) => a.ophTier !== 'secondary');
  const extendedArts = oph.filter((a) => a.ophTier === 'secondary');

  const sections = OPH_JOURNAL_GROUPS.map((g) => ({
    group: g.name,
    journals: g.journals.map((j) => ({
      label: j.label,
      ta: j.ta,
      ifRef: j.ifRef ?? null,
      group: g.name,
      items: target
        .filter((a) => a.journal === j.label)
        .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    }))
  }));

  const extMap = new Map();
  for (const a of extendedArts) {
    const key = a.journal || '其他';
    if (!extMap.has(key)) extMap.set(key, []);
    extMap.get(key).push(a);
  }
  const extended = [...extMap.entries()]
    .map(([label, items]) => ({ label, items: items.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)) }))
    .sort((a, b) => b.items.length - a.items.length);

  return { sections, extended };
}

export async function generateReports(articles) {
  const day = dateStr();
  const dir = path.join(REPORTS_DIR, day);
  fs.mkdirSync(dir, { recursive: true });
  const { sections, extended } = buildSections(articles);
  const files = [];
  for (const t of [
    { name: '公众号稿.docx', kind: 'mp' },
    { name: '网站介绍稿.docx', kind: 'site' }
  ]) {
    const buf = await Packer.toBuffer(genDocx(sections, extended, t.kind));
    fs.writeFileSync(path.join(dir, t.name), buf);
    files.push({ name: t.name, size: buf.length, path: `${day}/${t.name}` });
  }
  return { day, files, sectionCount: sections.length, extendedJournals: extended.length };
}

// ---------- 日报主流程 ----------
export async function runOphDaily({ force = false } = {}) {
  const db = getDb();
  if (db.meta?.ophSyncing && !force) return { skipped: true };
  db.meta.ophSyncing = true;
  commit();

  const day = dateStr();
  const result = {
    at: new Date().toISOString(),
    day,
    targetAdded: 0,
    extendedAdded: 0,
    reclassified: 0,
    titleCnBackfilled: 0,
    titleCnFailed: 0,
    files: [],
    errors: []
  };
  try {
    // 1) 非破坏性：重算已有论文的期刊归属与分组（不删除任何历史数据）
    result.reclassified = reclassifyExisting();

    // 2) 抓取：目标 19 本期刊 + 扩展推荐（其他期刊）
    const t = await syncTargetJournals();
    const e = await syncExtended();
    result.targetAdded = t.added;
    result.extendedAdded = e.added;
    await sleep(300);

    // 3) 补齐历史论文的中文标题（限流，避免一次耗尽翻译额度）
    let done = 0;
    for (const a of db.articles) {
      if (done >= OPH_BACKFILL_MAX) break;
      if (!(a.tags || []).includes(OPH_TAG)) continue;
      if (a.titleCn) continue;
      const cn = await ensureTitleCn(a);
      if (cn) result.titleCnBackfilled++;
      else result.titleCnFailed++;
      done++;
      await sleep(200);
    }

    // 4) 生成按期刊分区的日报文档
    const rep = await generateReports(db.articles);
    result.files = rep.files;
    result.sections = rep.sectionCount;
    result.extendedJournals = rep.extendedJournals;
    db.meta.lastOph = result;
  } catch (err) {
    result.errors.push(String(err?.message || err));
    db.meta.lastOph = result;
  } finally {
    db.meta.ophSyncing = false;
    commit();
    console.log('[lifesci-hub][眼科AI日报]', JSON.stringify(result));
  }
  return result;
}
