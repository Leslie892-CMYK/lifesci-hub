// 自动更新引擎
// 1) syncJournals：从 PubMed E-utilities 抓取顶刊最新文献（含真实 DOI），去重后写入文章库
// 2) syncCompetitions：解析学校创新创业学院官网（cxcy.hmc.edu.cn/sy/tzgg/）竞赛通知，去重后写入比赛动态
// 可配置：JOURNAL_SOURCES / SCHOOL_NOTICE_URL / 每次同步上限

import { getDb, commit, commitNow, nextId } from './db.js';
import { backupDb } from './backup.js';
import { ensureArticleTitleCn, quotaState, providerState } from './translate.js';

// ---------- 配置区 ----------
export const JOURNAL_SOURCES = [
  { name: 'Nature', pubmed: 'Nature' },
  { name: 'Science', pubmed: 'Science' },
  { name: 'Cell', pubmed: 'Cell' },
  { name: 'NEJM', pubmed: 'N Engl J Med' },
  { name: 'The Lancet', pubmed: 'Lancet' },
  { name: 'Nature Medicine', pubmed: 'Nat Med' },
  { name: 'Nature Biotechnology', pubmed: 'Nat Biotechnol' },
  { name: 'Nature Communications', pubmed: 'Nat Commun' },
  { name: 'PNAS', pubmed: 'Proc Natl Acad Sci U S A' }
];
export const JOURNAL_LOOKBACK_DAYS = 14; // 只收录最近 N 天发表
export const MAX_JOURNAL_ITEMS_PER_RUN = 20; // 每次同步最多新增
export const MAX_COMPETITION_ITEMS_PER_RUN = 5;
export const SCHOOL_NOTICE_URL = 'https://cxcy.hmc.edu.cn/xsjs/jstz/';
export const MAX_SCHOOL_NOTICE_PAGES = 3;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'LifeSciHub-Updater/1.0 (academic demo; contact: admin@lifesci.local)'
    },
    signal: AbortSignal.timeout(20000)
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

// ---------- 通用工具 ----------
function stripTags(s) {
  return String(s || '')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/\s+/g, ' ')
    .trim();
}

export function mapJournalName(raw) {
  const map = {
    Nature: 'Nature',
    'Science (New York, N.Y.)': 'Science',
    Cell: 'Cell',
    'The New England journal of medicine': 'NEJM',
    'Lancet (London, England)': 'The Lancet',
    'Nature medicine': 'Nature Medicine',
    'Nature biotechnology': 'Nature Biotechnology',
    'Nature communications': 'Nature Communications',
    'Proceedings of the National Academy of Sciences of the United States of America': 'PNAS'
  };
  return map[raw] || raw;
}

const MONTH_NAMES = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };


// ---------- 顶刊文献同步 ----------
export function parsePubMedXml(xml, fallbackJournal) {
  const out = [];
  const blocks = xml.split(/<PubmedArticle[\s>]/);
  for (let i = 1; i < blocks.length; i++) {
    const b = blocks[i];
    const titleM = b.match(/<ArticleTitle>(.*?)<\/ArticleTitle>/s);
    if (!titleM) continue;
    const title = stripTags(titleM[1]);
    const publicationTypes = [...b.matchAll(/<PublicationType[^>]*>(.*?)<\/PublicationType>/gs)]
      .map((m) => stripTags(m[1]).toLowerCase());
    if (
      /^(correction|erratum|editorial|comment)\b/i.test(title) ||
      publicationTypes.some((type) => /(correction|retraction|editorial|comment|news)/.test(type))
    ) {
      continue;
    }
    const abstract = [...b.matchAll(/<AbstractText[^>]*>(.*?)<\/AbstractText>/gs)]
      .map((m) => stripTags(m[1]))
      .filter(Boolean)
      .join(' ')
      .slice(0, 1200);

    const doiM =
      b.match(/<ArticleId IdType="doi">([^<]+)<\/ArticleId>/) ||
      b.match(/<ELocationID EIdType="doi"[^>]*>([^<]+)<\/ELocationID>/);
    const pmcM = b.match(/<ArticleId IdType="pmc">([^<]+)<\/ArticleId>/);
    const al = b.match(/<AuthorList[^>]*>([\s\S]*?)<\/AuthorList>/);
    let authors = '';
    if (al) {
      const names = [...al[1].matchAll(/<LastName>([^<]+)<\/LastName>\s*(?:<ForeName>([^<]*)<\/ForeName>)?/g)].slice(0, 3);
      if (names.length) {
        const fmt = names
          .map((m) => `${m[1]}${m[2] ? ' ' + m[2].split(/\s+/).map((s) => s[0]).join('') : ''}`)
          .join(', ');
        authors = names.length >= 3 ? `${fmt}, et al.` : fmt;
      }
    }

    const pd =
      b.match(/<ArticleDate[^>]*DateType="Electronic"[^>]*>([\s\S]*?)<\/ArticleDate>/) ||
      b.match(/<PubDate>([\s\S]*?)<\/PubDate>/);
    let date = new Date().toISOString();
    if (pd) {
      const y = pd[1].match(/<Year>(\d+)<\/Year>/);
      const mo = pd[1].match(/<Month>([^<]+)<\/Month>/);
      const da = pd[1].match(/<Day>(\d+)<\/Day>/);
      if (y) {
        let month = 1;
        if (mo) {
          const raw = String(mo[1]).trim().toLowerCase();
          if (/^\d+$/.test(raw)) month = Number(raw);
          else month = MONTH_NAMES[raw.slice(0, 3)] || 1;
        }
        const dt = new Date(Number(y[1]), month - 1, da ? Number(da[1]) : 1);
        date = dt.toISOString();
      }
    }

    const jt = b.match(/<Journal>[\s\S]*?<Title>([^<]+)<\/Title>/);
    out.push({
      title,
      abstract,
      doi: doiM ? doiM[1] : '',
      pmc: pmcM ? pmcM[1] : '',
      authors,
      date,
      journal: mapJournalName(jt ? stripTags(jt[1]) : fallbackJournal)
    });
  }
  return out.filter((a) => a.doi && a.title);
}

export async function syncJournals() {
  const db = getDb();
  let added = 0;
  const errors = [];
  const cutoff = Date.now() - JOURNAL_LOOKBACK_DAYS * 86400000;

  for (const src of JOURNAL_SOURCES) {
    if (added >= MAX_JOURNAL_ITEMS_PER_RUN) break;
    try {
      const esearch = await fetchText(
        `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(
          `"${src.pubmed}"[ta]`
        )}&reldate=${JOURNAL_LOOKBACK_DAYS}&datetype=pdat&retmax=3`
      );
      const ids = [...esearch.matchAll(/<Id>(\d+)<\/Id>/g)].map((m) => m[1]);
      if (!ids.length) continue;
      await sleep(400);

      const efetch = await fetchText(
        `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${ids.join(',')}&rettype=abstract&retmode=xml`
      );
      const arts = parsePubMedXml(efetch, src.name);
      for (const a of arts) {
        if (added >= MAX_JOURNAL_ITEMS_PER_RUN) break;
        const pubTime = new Date(a.date).getTime();
        if (pubTime < cutoff) continue; // 太旧
        if (db.articles.some((x) => String(x.doi).toLowerCase() === a.doi.toLowerCase())) continue; // 已存在

        db.articles.push({
          id: nextId(),
          title: a.title,
          summary: (a.abstract || `《${a.journal}》最新研究论文。`).slice(0, 300),
          content: [a.abstract || '暂无摘要，请通过原文链接查看。', `原文链接：https://doi.org/${a.doi}`].join('\n\n'),
          category: 'journal',
          journal: a.journal,
          authors: a.authors,
          doi: a.doi,
          tags: ['自动同步', a.journal],
          publishedAt: a.date,
          authorId: null,
          views: 0,
          source: 'auto'
        });
        added++;
      }
      await sleep(400);
    } catch (e) {
      errors.push(`${src.name}: ${e.message}`);
    }
  }
  commit();
  return { added, errors };
}

// ---------- 学校竞赛通知同步 ----------
function isCompetitionNotice(title) {
  return (
    /(竞赛|大赛|比赛|挑战杯|选拔赛|邀请赛)/.test(title) &&
    !/(公示|结果|获奖|考核|检查|验收|讲座|培训|展|佳绩|圆满|落幕|喜获|荣获|答辩)/.test(title)
  );
}

export function parseNoticeList(html) {
  const items = [];
  const re = /<a[^>]*href="(?:https?:\/\/cxcy\.hmc\.edu\.cn)?(\/sy\/tzgg\/\d{6}\/t\d+_\d+\.shtml)"[^>]*>([\s\S]*?)<\/a>/g;
  let m;
  while ((m = re.exec(html))) {
    const block = m[2];
    const dayM = block.match(/<span class="day">([\s\S]*?)<\/span>/);
    const yearM = block.match(/<span class="year">([\s\S]*?)<\/span>/);
    const titleM =
      block.match(/<h4 class="title">([\s\S]*?)<\/h4>/) ||
      block.match(/<h\d[^>]*class="title"[^>]*>([\s\S]*?)<\/h\d>/);
    items.push({
      href: 'https://cxcy.hmc.edu.cn' + m[1],
      date: dayM && yearM ? `${stripTags(yearM[1])}-${stripTags(dayM[1])}` : '',
      title: titleM ? stripTags(titleM[1]) : ''
    });
  }
  return items;
}

export function parseNoticeDetail(html) {
  // 标题：doc-title 容器
  const titleM = html.match(/<div class="doc-title">([\s\S]*?)<\/div>/);
  const title = titleM ? stripTags(titleM[1]) : '';

  // 日期：日期：YYYY-MM-DD
  const dateM = html.match(/日期：\s*(?:<[^>]+>)*\s*(\d{4}-\d{2}-\d{2})/);
  const date = dateM ? dateM[1] : '';

  // 只解析正文容器，避免把导航、附件脚本和网站页脚写入比赛详情。
  const bodyM = html.match(/<div class="doc-html">([\s\S]*?)<script\b/i) ||
    html.match(/<div class="doc-html">([\s\S]*?)<\/div>/i);
  const body = String(bodyM?.[1] || '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<\/(?:p|div|li|h\d)>/gi, '\n')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, '')
    .replace(/\n{2,}/g, '\n')
    .trim();

  // 按「一、二、三…」章节切分段落
  const sections = body
    .split(/(?=[一二三四五六七八九十]+、)/)
    .map((s) => s.trim())
    .filter(Boolean);

  const intro = (sections[0] && !/^[一二三四五六七八九十]+、/.test(sections[0])
    ? sections[0]
    : sections[1] || sections[0] || ''
  ).slice(0, 200);

  const submissionSection =
    sections.find((s) => /^[一二三四五六七八九十]+、[^\n]*(提交|申报材料|作品要求)/.test(s)) ||
    sections.find((s) => /(提交材料|申报材料|作品要求)/.test(s));
  const submission = submissionSection?.slice(0, 1200) || '';

  const scheduleSection = sections.find((s) => /(时间安排|日程安排|竞赛时间|比赛时间)/.test(s)) || '';
  const timeline = scheduleSection
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => /[：:]/.test(line) && !/^[一二三四五六七八九十]+、/.test(line))
    .map((line) => {
      const parts = line.split(/[：:]/, 2);
      return { label: parts[0].slice(0, 40), date: parts[1].slice(0, 80) };
    })
    .slice(0, 12);

  const deadlineLine = body
    .split(/\n+/)
    .find((line) => /(报名|申报|提交).{0,30}\d{4}\s*年\s*\d{1,2}\s*月\s*\d{1,2}\s*日/.test(line));
  const deadlineMatches = deadlineLine
    ? [...deadlineLine.matchAll(/(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/g)]
    : [];
  const deadlineMatch = deadlineMatches.at(-1);
  const deadline = deadlineMatch
    ? `${deadlineMatch[1]}-${deadlineMatch[2].padStart(2, '0')}-${deadlineMatch[3].padStart(2, '0')}`
    : null;
  const daysUntilDeadline = deadline
    ? Math.ceil((new Date(`${deadline}T23:59:59+08:00`).getTime() - Date.now()) / 86400000)
    : null;
  const status = daysUntilDeadline === null
    ? '进行中'
    : daysUntilDeadline < 0
      ? '已结束'
      : daysUntilDeadline <= 7
        ? '即将截止'
        : '报名中';

  return {
    title: title || '竞赛通知',
    date: date ? `${date}T08:00:00.000Z` : new Date().toISOString(),
    intro,
    submission,
    timeline,
    deadline,
    status,
    content: sections.join('\n\n').slice(0, 6000)
  };
}

function guessType(title) {
  if (/(创新|创业|挑战杯|互联网|乡村振兴)/.test(title)) return '创新创业';
  if (/(生命科学|物理|数学|建模|英语|化学|医学|实验|设计)/.test(title)) return '学科竞赛';
  return '其他';
}

function guessLevel(title) {
  if (/(全国|中国|国际|挑战杯|互联网\+)/.test(title)) return '国家级';
  if (/(浙江|省)/.test(title)) return '省级';
  return '校级';
}

export async function syncCompetitions() {
  const db = getDb();
  let added = 0;
  const errors = [];
  const seen = new Set();
  const competitionHub = db.communities.find((c) => c.slug === 'competition-hub');
  let firstPageHtml;
  try {
    firstPageHtml = await fetchText(`${SCHOOL_NOTICE_URL}index.shtml`);
  } catch (e) {
    return { added, errors: [`index.shtml: ${e.message}`] };
  }
  const pageCount = Math.max(1, Number(firstPageHtml.match(/var\s+pageCount\s*=\s*(\d+)/)?.[1]) || 1);
  const pages = Array.from(
    { length: Math.min(pageCount, MAX_SCHOOL_NOTICE_PAGES) },
    (_, index) => index === 0 ? 'index.shtml' : `index_${index}.shtml`
  );

  for (const page of pages) {
    if (added >= MAX_COMPETITION_ITEMS_PER_RUN) break;
    try {
      const html = page === 'index.shtml' ? firstPageHtml : await fetchText(SCHOOL_NOTICE_URL + page);
      const items = parseNoticeList(html);
      for (const it of items) {
        if (added >= MAX_COMPETITION_ITEMS_PER_RUN) break;
        if (seen.has(it.href)) continue;
        seen.add(it.href);
        const existing = db.competitions.find((c) => c.sourceUrl === it.href);
        if (existing && (existing.source !== '官网同步' || existing.syncVersion === 2)) continue;
        if (!isCompetitionNotice(it.title)) continue; // 列表标题预过滤

        const detailHtml = await fetchText(it.href);
        const d = parseNoticeDetail(detailHtml);
        if (!isCompetitionNotice(d.title || it.title)) continue;

        if (existing) {
          Object.assign(existing, {
            title: d.title,
            intro: d.intro,
            timeline: d.timeline,
            submission: d.submission,
            deadline: d.deadline,
            status: d.status,
            communityId: existing.communityId || competitionHub?.id || null,
            content: d.content,
            publishedAt: d.date,
            syncVersion: 2
          });
          await sleep(500);
          continue;
        }

        db.competitions.push({
          id: nextId(),
          title: d.title,
          source: '官网同步',
          sourceUrl: it.href,
          organizer: '杭州医学院创新创业学院（详见官网通知）',
          type: guessType(d.title),
          catalogLevel: '待认定',
          level: guessLevel(d.title),
          star: 3,
          intro: d.intro,
          timeline: d.timeline,
          submission: d.submission,
          deadline: d.deadline,
          status: d.status,
          tags: ['官网同步'],
          communityId: competitionHub?.id || null,
          content: d.content,
          publishedAt: d.date,
          authorId: null,
          views: 0,
          syncVersion: 2
        });
        added++;
        await sleep(500);
      }
    } catch (e) {
      errors.push(`${page}: ${e.message}`);
    }
  }
  commit();
  return { added, errors };
}

// ---------- 全站中文标题补翻（所有自动同步论文） ----------
export const TITLE_BACKFILL_MAX = Number(process.env.TITLE_BACKFILL_MAX) || 25;

// 中文标题补翻 / 重译
//   limit    单次处理条数
//   force    重译模式：对已有中文标题（早期 MyMemory 机器翻译，专业术语易出错）用百度重新翻译，
//            旧译文保存在 titleCnPrev 中，绝不删除历史数据，英文原题始终保留
//   ophOnly  仅处理眼科AI文章（老师重点关注的部分）
export async function backfillTitles(limit = TITLE_BACKFILL_MAX, { force = false, ophOnly = false } = {}) {
  const db = getDb();
  const english = db.articles.filter((a) => !/[\u4e00-\u9fa5]/.test(String(a.title || ''))); // 中文标题的无需翻译
  const scope = ophOnly ? english.filter((a) => !!a.ophTier) : english;
  const pending = (force ? scope.filter((a) => !!a.titleCn) : scope.filter((a) => !a.titleCn))
    .sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt))); // 最新优先
  let ok = 0;
  let fail = 0;
  const startedAt = Date.now();
  for (const a of pending.slice(0, limit)) {
    if (quotaState.exhausted) break; // 两个通道都不可用，明天继续
    if (force && a.titleCn) a.titleCnPrev = a.titleCn; // 保留旧译文，可追溯、可回退
    const cn = await ensureArticleTitleCn(a, { force });
    if (cn) ok++;
    else fail++;
    // 百度通道很快，无需长等待；MyMemory 兜底时放慢以免触发限制
    await sleep(providerState.last === 'baidu' ? 60 : 200);
    if ((ok + fail) % 10 === 0) commit(); // 分批落盘，避免长时间任务中断后丢失进度
  }
  if (ok || fail) commit();
  return {
    pending: pending.length,
    ok,
    fail,
    force,
    ophOnly,
    provider: providerState.last,
    seconds: Number(((Date.now() - startedAt) / 1000).toFixed(1)),
    quotaExhausted: quotaState.exhausted
  };
}

// ---------- 总入口 ----------
export async function runAutoUpdate() {
  const db = getDb();
  if (db.meta?.syncing) return { skipped: true };
  // 修改数据前先自动备份一份（保留最近 20 份，失败不影响同步）
  try {
    backupDb();
  } catch {
    // 忽略备份失败
  }
  db.meta.syncing = true;
  commit();

  const report = { at: new Date().toISOString(), journals: null, competitions: null };
  try {
    report.journals = await syncJournals();
    report.competitions = await syncCompetitions();
    report.titles = await backfillTitles(); // 全站中文标题补翻（限流）
    db.meta.lastSync = report;
    db.meta.lastSyncError = null;
  } catch (e) {
    db.meta.lastSyncError = String(e?.message || e);
  } finally {
    db.meta.syncing = false;
    commitNow(); // 同步落盘，避免独立进程退出前丢失防抖写入
    console.log('[lifesci-hub][自动更新完成]', JSON.stringify(report));
  }
  return report;
}
