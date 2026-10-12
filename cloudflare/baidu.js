// Same endpoint and JSON contract used by the official trans-cli. Secrets are
// read only on the server; they are never passed to the browser or logged.
const ENDPOINT = 'https://fanyi-api.baidu.com/ait/api/agent/text/translate';

export async function runBaidu(args, input, timeoutMs = 25000) {
  const key = process.env.TRANS_API_KEY;
  if (!key) return { ok: false, code: 'CONFIG_MISSING', message: '未配置百度 API Key' };
  try {
    const diagnostic = args[0] === 'doctor';
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ q: diagnostic ? 'Hello' : String(input), from: 'en', to: 'zh' }),
      signal: AbortSignal.timeout(timeoutMs)
    });
    const data = await response.json();
    const code = String(data.error_code || '');
    if (!response.ok || (code && code !== '0')) {
      const mapped = ['52003', '54001', '58002', '90107'].includes(code) || response.status === 401 ? 'AUTH_FAILED'
        : ['54003', '52007'].includes(code) || response.status === 429 ? 'RATE_LIMITED'
        : ['54004', '90103', '52006'].includes(code) ? 'QUOTA_EXCEEDED' : 'API_ERROR';
      return { ok: false, code: mapped, message: '百度翻译接口返回错误', rawCode: code };
    }
    const translated = Array.isArray(data.trans_result) ? data.trans_result.map((part) => part.dst || '').join('\n') : String(data.translated || data.output || '');
    if (!translated) return { ok: false, code: 'BAD_OUTPUT', message: '百度翻译未返回有效译文' };
    return { ok: true, data: diagnostic ? { all_ok: true, checks: [{ name: 'api_key', ok: true }, { name: 'connectivity', ok: true }, { name: 'account', ok: true }] } : { translated } };
  } catch (error) {
    return { ok: false, code: error.name === 'TimeoutError' ? 'TIMEOUT' : 'NETWORK_ERROR', message: '百度翻译连接失败或超时' };
  }
}
