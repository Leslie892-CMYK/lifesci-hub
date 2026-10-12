// 期刊归属核查 / 修复脚本
//   背景：早期版本用「子串匹配」判断期刊，导致 GeroScience、Advanced Science、CNS Neuroscience &
//   Therapeutics、Health Data Science、Future Science OA 等被误判为 CNS 正刊 Science；
//   BMC Ophthalmology 之类也会被子串命中目标刊 Ophthalmology。这会让日报把非目标刊论文
//   列在「Science（N 篇）」下面。
//   本脚本用 DOI 向 Crossref 反查真实刊名，用修正后的 journalMeta 重新判定：
//     node server/repair-journals.js            # 只检查（dry-run，不写库，服务运行时也可执行）
//     node server/repair-journals.js --apply    # 实际修复（需先停止服务，避免内存数据覆盖）
// 修复方式：真实刊名写回 journal 字段，原值保存在 journalPrev（不删除任何历史数据），
//          随后用 reclassifyExisting() 重算目标/扩展层级。
import { getDb, commitNow } from './db.js';
import { journalMeta, reclassifyExisting } from './oph.js';

const APPLY = process.argv.includes('--apply');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function decodeEntities(s) {
  return String(s || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

async function crossrefJournal(doi) {
  const url = `https://api.crossref.org/works/${encodeURIComponent(doi)}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'LifeSciHub-JournalAudit/1.0 (mailto:lifesci@example.com)' },
    signal: AbortSignal.timeout(20000)
  });
  if (!res.ok) throw new Error(`Crossref HTTP ${res.status}`);
  const data = await res.json();
  const ct = data?.message?.['container-title'];
  return decodeEntities(Array.isArray(ct) ? ct[0] : '');
}

const db = getDb();
// 只核查「被判为目标期刊」的文章（误判只会出现在这里）
const suspects = db.articles.filter((a) => a.doi && journalMeta(a.journal).target === true);
console.log(`待核查（当前判为目标期刊）：${suspects.length} 篇`);

const mismatches = [];
let checked = 0;
let failed = 0;
for (const a of suspects) {
  try {
    const real = await crossrefJournal(a.doi);
    checked++;
    if (!real) continue;
    const correct = journalMeta(real);
    if (correct.journal !== a.journal) {
      mismatches.push({ id: a.id, stored: a.journal, real, correct: correct.journal, target: correct.target, title: a.title });
      console.log(`❌ #${a.id} 现标「${a.journal}」→ 实际「${real}」→ 应归「${correct.journal}」${correct.target ? '（目标期刊）' : '（扩展推荐）'}`);
    }
  } catch (e) {
    failed++;
    console.log(`⚠️ #${a.id} 查询失败：${e.message}`);
  }
  await sleep(120); // 尊重 Crossref 限流
}

console.log(`\n核查完成：成功 ${checked} 篇，失败 ${failed} 篇，发现误判 ${mismatches.length} 篇`);

if (!mismatches.length) {
  console.log('✅ 无需修复');
  process.exit(0);
}

if (!APPLY) {
  console.log('\n（dry-run 模式，未修改数据。加 --apply 参数执行修复）');
  process.exit(0);
}

for (const m of mismatches) {
  const a = db.articles.find((x) => x.id === m.id);
  if (!a) continue;
  a.journalPrev = a.journal;  // 保留原值，可追溯
  a.journal = m.real;         // 写回真实刊名
  a.journalFixedAt = new Date().toISOString();
}
const stat = reclassifyExisting(); // 重算目标/扩展层级（非破坏性）
commitNow();
console.log(`\n✅ 已修复 ${mismatches.length} 篇并重算层级：${JSON.stringify(stat)}`);
