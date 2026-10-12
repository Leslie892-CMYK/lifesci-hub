// Shared NCBI pacing across the ordinary updater and the ophthalmology job.
// Retry only transient failures; never turn an API error into an empty result.
export function createTextFetcher({ request = (...args) => fetch(...args), wait = (ms) => new Promise((r) => setTimeout(r, ms)), now = () => Date.now(), random = Math.random } = {}) {
  let queue = Promise.resolve();
  let lastStart = 0;
  let blockedUntil = 0;
  async function perform(input, ncbi) {
    if (ncbi && blockedUntil > now()) throw new Error('PubMed 限流冷却中，请稍后重试');
    const url = new URL(input);
    if (ncbi) {
      url.searchParams.set('tool', 'lifescihub');
      if (process.env.NCBI_API_KEY) url.searchParams.set('api_key', process.env.NCBI_API_KEY);
      if (process.env.NCBI_EMAIL) url.searchParams.set('email', process.env.NCBI_EMAIL);
    }
    for (let attempt = 0; attempt < 4; attempt++) {
      if (ncbi) {
        const delay = lastStart + 550 - now();
        if (delay > 0) await wait(delay);
        lastStart = now();
      }
      let response;
      try {
        response = await request(url.toString(), { headers: { 'User-Agent': 'LifeSciHub-Updater/1.0' }, signal: AbortSignal.timeout(20000) });
      } catch {
        if (attempt === 3) throw new Error('数据源连接失败或超时');
        await wait(2000 * 2 ** attempt + random() * 500);
        continue;
      }
      if (response.status === 429 || response.status >= 500) {
        const status = response.status;
        const header = response.headers.get('Retry-After');
        const retryAfter = header && (/^\d+$/.test(header) ? Number(header) * 1000 : Date.parse(header) - now());
        await response.body?.cancel();
        if (attempt === 3 || retryAfter > 30000) {
          if (ncbi && status === 429) blockedUntil = now() + Math.max(300000, retryAfter || 0);
          throw new Error(`HTTP ${status}${status === 429 ? '（数据源限流）' : ''}`);
        }
        await wait(Math.max(retryAfter || 0, 2000 * 2 ** attempt + random() * 500));
        continue;
      }
      if (!response.ok) { await response.body?.cancel(); throw new Error(`HTTP ${response.status}`); }
      const body = await response.text();
      if (ncbi && (/<ERROR\b/i.test(body) || /^\s*\{\s*"error"\s*:/.test(body))) throw new Error('PubMed 返回查询错误，未作为空结果处理');
      return body;
    }
  }
  return function fetchText(url) {
    const ncbi = new URL(url).hostname === 'eutils.ncbi.nlm.nih.gov';
    if (!ncbi) return perform(url, false);
    const job = queue.then(() => perform(url, true));
    queue = job.catch(() => {});
    return job;
  };
}

export const fetchText = createTextFetcher();
