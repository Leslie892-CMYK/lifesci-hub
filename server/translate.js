// 通用翻译模块
// 翻译通道优先级：
//   1) 百度翻译（官方 trans-cli，走百度 AI 翻译接口，速度快、术语准确；需配置 API Key）
//   2) MyMemory 免费接口（国内可直连，无需 Key，有每日额度限制）——仅作兜底
// 两者都不可用时返回空字符串，由调用方回退显示英文原题（绝不编造）。
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// 一、百度翻译通道（trans-cli，参考技能文档 baidu-text-translate）
// ---------------------------------------------------------------------------
// 环境自诊断：trans doctor --json
// 成功：{"from":"en","to":"zh","source":"…","translated":"…"}  退出码 0
// 失败：stderr {"code":"AUTH_FAILED","message":"…","raw_code":"52001"}  退出码 ≠ 0
// 退出码含义：1=入参错误 2=配置/鉴权失败（需人工处理） 3=额度/限流 4=网络
const BAIDU_FATAL_CODES = new Set(['CONFIG_MISSING', 'AUTH_FAILED', 'QUOTA_EXCEEDED']);
const BAIDU_CHUNK = 1800; // 单次请求字符上限（保守值）

export const baiduState = {
  bin: '',
  resolved: false,
  blocked: false,      // 遇到需人工处理的错误后暂时不再尝试（到期自动解除，避免网络抖动导致永久失效）
  blockedUntil: 0,
  blockCode: '',
  blockMessage: '',
  lastError: '',
  calls: 0,
  ok: 0,
  lastOkAt: ''
};

// 各类失败原因的封锁时长：网络类问题短（自动恢复），需人工处理的（密钥/额度）长一些但仍会自动重试
const BLOCK_TTL_MS = {
  NETWORK: 2 * 60 * 1000,        // 网络抖动：2 分钟后自动重试
  CLI_MISSING: 30 * 60 * 1000,   // 未安装 CLI：30 分钟后重新探测（可能在期间装好了）
  CONFIG_MISSING: 30 * 60 * 1000,
  AUTH_FAILED: 30 * 60 * 1000,
  QUOTA_EXCEEDED: 60 * 60 * 1000
};

function resolveTransBin() {
  if (baiduState.resolved) return baiduState.bin;
  const candidates = [
    process.env.TRANS_BIN,
    path.join(PROJECT_ROOT, 'node_modules', '.bin', 'trans'),
    '/opt/homebrew/bin/trans',
    '/usr/local/bin/trans',
    path.join(process.env.HOME || '', '.local', 'bin', 'trans')
  ].filter(Boolean);
  for (const c of candidates) {
    try {
      if (fs.existsSync(c)) { baiduState.resolved = true; baiduState.bin = c; return c; }
    } catch { /* 忽略 */ }
  }
  // 回退到 PATH 查找（spawn 时若找不到会 ENOENT，由调用方判定不可用）
  baiduState.resolved = true;
  baiduState.bin = 'trans';
  return baiduState.bin;
}

// 运行 trans 命令；文本通过 stdin 传入，避免引号/换行等转义问题
function runTrans(args, input, timeoutMs = 25000) {
  const bin = resolveTransBin();
  return new Promise((resolve) => {
    let child;
    try {
      child = spawn(bin, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    } catch (e) {
      resolve({ ok: false, code: 'SPAWN_ERROR', message: e.message, missing: true });
      return;
    }
    let out = '';
    let err = '';
    let done = false;
    const finish = (payload) => { if (!done) { done = true; clearTimeout(timer); resolve(payload); } };
    const timer = setTimeout(() => {
      try { child.kill('SIGKILL'); } catch { /* 忽略 */ }
      finish({ ok: false, code: 'TIMEOUT', message: '翻译请求超时' });
    }, timeoutMs);
    child.stdout.on('data', (d) => { out += d.toString(); });
    child.stderr.on('data', (d) => { err += d.toString(); });
    child.on('error', (e) => {
      finish({ ok: false, code: 'SPAWN_ERROR', message: e.message, missing: e.code === 'ENOENT' });
    });
    child.on('close', (code) => {
      if (code === 0) {
        try {
          const data = JSON.parse(out.trim());
          finish({ ok: true, data });
        } catch {
          finish({ ok: false, code: 'BAD_OUTPUT', message: out.slice(0, 200) });
        }
        return;
      }
      let info = { code: 'API_ERROR', message: err.trim().slice(0, 300) };
      try {
        const parsed = JSON.parse(err.trim());
        info = { code: parsed.code || info.code, message: parsed.message || info.message, rawCode: parsed.raw_code, helpUrl: parsed.help_url };
      } catch { /* 保持原样 */ }
      finish({ ok: false, ...info, exitCode: code, raw: out.trim() });
    });
    try { child.stdin.on('error', () => { /* EPIPE 忽略 */ }); } catch { /* 忽略 */ }
    child.stdin.end(String(input ?? ''));
  });
}

// 百度通道当前是否可用（封锁到期后自动恢复，避免一次网络抖动就需要人工干预）
export function baiduUsable() {
  if (!baiduState.blocked) return true;
  if (baiduState.blockedUntil && Date.now() >= baiduState.blockedUntil) {
    baiduState.blocked = false;
    baiduState.blockedUntil = 0;
    baiduState.blockCode = '';
    baiduState.blockMessage = '';
    return true;
  }
  return false;
}

function markBaiduFatal(code, message, ttlKey) {
  const ttl = BLOCK_TTL_MS[ttlKey || code] ?? BLOCK_TTL_MS.AUTH_FAILED;
  baiduState.blocked = true;
  baiduState.blockedUntil = Date.now() + ttl;
  baiduState.blockCode = code || 'ERROR';
  baiduState.blockMessage = message || '';
  baiduState.lastError = `${code}: ${message || ''}`.slice(0, 300);
}

async function baiduTranslateChunk(chunk) {
  const args = ['text', '--json', '--from', 'en', '--to', 'zh'];
  baiduState.calls += 1;
  let r = await runTrans(args, chunk);
  if (!r.ok && r.code === 'RATE_LIMITED') { // QPS 超限：等 1 秒重试一次
    await sleep(1200);
    baiduState.calls += 1;
    r = await runTrans(args, chunk);
  } else if (!r.ok && r.code === 'NETWORK_ERROR') {
    // 网络抖动：间隔 2 秒重试两次（技能文档建议）
    for (let i = 0; i < 2 && !r.ok; i++) {
      await sleep(2000);
      baiduState.calls += 1;
      r = await runTrans(args, chunk);
      if (r.ok) break;
    }
  }
  if (r.ok) {
    baiduState.ok += 1;
    baiduState.lastOkAt = new Date().toISOString();
    return String(r.data?.translated || '').trim();
  }
  if (r.missing) {
    markBaiduFatal('CLI_MISSING', '未安装 trans-cli（npm i @bdtrans/trans-cli）');
    return '';
  }
  if (r.code === 'NETWORK_ERROR' || r.code === 'TIMEOUT') {
    // 网络类问题：短时封锁后自动重试，不当作需要人工处理的故障
    markBaiduFatal(r.code, r.message || '网络异常', 'NETWORK');
    return '';
  }
  if (BAIDU_FATAL_CODES.has(r.code)) {
    markBaiduFatal(r.code, r.message);
    return '';
  }
  baiduState.lastError = `${r.code}: ${r.message || ''}`.slice(0, 300);
  return '';
}

// 百度翻译整段文本（自动分块）
export async function translateByBaidu(text) {
  if (!baiduUsable()) return '';
  const raw = String(text || '').trim();
  if (!raw) return '';
  const chunks = [];
  for (let i = 0; i < raw.length; i += BAIDU_CHUNK) chunks.push(raw.slice(i, i + BAIDU_CHUNK));
  const out = [];
  for (const c of chunks) {
    const t = await baiduTranslateChunk(c);
    if (!t) break; // 失败或已标记不可用，交给兜底通道
    out.push(t);
  }
  return out.join('').trim();
}

// 环境自诊断（对应 trans doctor --json），供管理端查看/恢复通道
export async function baiduDoctor() {
  const r = await runTrans(['doctor', '--json'], '', 15000);
  if (r.missing) {
    markBaiduFatal('CLI_MISSING', '未安装 trans-cli（npm i @bdtrans/trans-cli）');
    return { allOk: false, reason: '未安装 trans-cli', checks: [] };
  }
  if (!r.ok && r.code !== 'API_ERROR') {
    return { allOk: false, reason: `${r.code}: ${r.message}`, checks: [] };
  }
  let parsed = r.data;
  if (!parsed && r.raw) { try { parsed = JSON.parse(r.raw); } catch { parsed = null; } }
  if (!parsed) {
    return { allOk: false, reason: r.message || '诊断失败', checks: [] };
  }
  const allOk = !!parsed.all_ok;
  if (allOk) { // 配置恢复正常：解除封锁
    baiduState.blocked = false;
    baiduState.blockedUntil = 0;
    baiduState.blockCode = '';
    baiduState.blockMessage = '';
  } else {
    const bad = (parsed.checks || []).find((c) => !c.ok) || {};
    if (bad.name === 'api_key') {
      markBaiduFatal('CONFIG_MISSING', bad.message || '未配置 API Key');
    } else if (bad.name === 'connectivity') {
      // 网络不通 ≠ 鉴权失败：短时封锁，稍后自动重试
      markBaiduFatal('NETWORK_ERROR', bad.message || '网络不可达', 'NETWORK');
    } else if (bad.name === 'account') {
      markBaiduFatal('AUTH_FAILED', bad.message || '账号或额度异常');
    } else {
      markBaiduFatal('API_ERROR', bad.message || '环境检查未通过');
    }
  }
  return { allOk, checks: parsed.checks || [], reason: allOk ? '' : baiduState.blockMessage };
}

// ---------------------------------------------------------------------------
// 二、MyMemory 兜底通道（免费、无需 Key，有每日额度）
// ---------------------------------------------------------------------------
async function fetchText(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'LifeSciHub-Updater/1.0 (academic demo)' },
    signal: AbortSignal.timeout(20000)
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

const myMemoryState = { exhausted: false, message: '' };

// 对外保持原有字段名；仅当百度通道不可用时才认为"额度耗尽"，避免误伤整体流程
export const quotaState = {
  get exhausted() { return !baiduUsable() && myMemoryState.exhausted; },
  get message() { return myMemoryState.message; }
};

function detectQuota(text) {
  const t = String(text || '');
  if (/MYMEMORY WARNING/i.test(t)) {
    myMemoryState.exhausted = true;
    myMemoryState.message = t.slice(0, 200);
    return true;
  }
  return false;
}

async function translateByMyMemory(text) {
  if (myMemoryState.exhausted) return '';
  const raw = String(text || '');
  if (!raw) return '';
  const chunks = [];
  const MAX = 450; // MyMemory 单次请求字符上限
  for (let i = 0; i < raw.length; i += MAX) chunks.push(raw.slice(i, i + MAX));
  const out = [];
  for (const c of chunks) {
    try {
      const url = 'https://api.mymemory.translated.net/get?q=' + encodeURIComponent(c) + '&langpair=en|zh-CN';
      const data = JSON.parse(await fetchText(url));
      const t = data?.responseData?.translatedText;
      if (detectQuota(t) || detectQuota(data?.responseDetails)) break; // 额度耗尽，立即停止
      if (t) out.push(t);
    } catch {
      // 单块失败可忽略
    }
    await sleep(300);
  }
  return out.join('').trim();
}

// ---------------------------------------------------------------------------
// 三、统一入口
// ---------------------------------------------------------------------------
export const providerState = { last: '' };

export async function translateCn(text) {
  const raw = String(text || '').trim();
  if (!raw) return '';
  const viaBaidu = await translateByBaidu(raw);
  if (viaBaidu) { providerState.last = 'baidu'; return viaBaidu; }
  const viaMM = await translateByMyMemory(raw);
  if (viaMM) providerState.last = 'mymemory';
  return viaMM;
}

// 翻译通道整体状态（管理端展示）
export function translationStatus() {
  return {
    lastProvider: providerState.last,
    baidu: {
      usable: baiduUsable(),
      bin: resolveTransBin(),
      blocked: baiduState.blocked,
      blockCode: baiduState.blockCode,
      blockMessage: baiduState.blockMessage,
      lastError: baiduState.lastError,
      calls: baiduState.calls,
      ok: baiduState.ok,
      lastOkAt: baiduState.lastOkAt
    },
    mymemory: {
      exhausted: myMemoryState.exhausted,
      message: myMemoryState.message
    }
  };
}

function norm(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

// 校验是否为可用的中文标题（避免英文原样写入、警告文本或空值）
export function isValidCnTitle(cn, original) {
  const t = String(cn || '').trim();
  if (!t) return false;
  if (!/[\u4e00-\u9fa5]/.test(t)) return false;
  if (norm(t) === norm(original)) return false;
  if (/MYMEMORY WARNING/i.test(t)) return false;
  return true;
}

// 为单篇文章补齐中文标题（写入 titleCn）
export async function ensureArticleTitleCn(article, { force = false } = {}) {
  if (!force && article.titleCn) return article.titleCn;
  const cn = await translateCn(String(article.title || '').slice(0, 300));
  if (isValidCnTitle(cn, article.title)) {
    article.titleCn = cn;
    article.titleCnAt = new Date().toISOString();
    article.titleCnProvider = providerState.last;
    delete article.titleCnFailedAt;
    return cn;
  }
  article.titleCn = '';
  article.titleCnFailedAt = new Date().toISOString();
  return '';
}
