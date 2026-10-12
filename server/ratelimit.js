// 轻量内存限流器（无第三方依赖）
// 用法：rateLimit({ windowMs, max, message, keyFn }) 返回 Express 中间件

const buckets = new Map(); // key -> { count, resetAt }

// 定时清理过期桶，防止内存无限增长（不阻塞进程退出）
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, b] of buckets) {
    if (b.resetAt <= now) buckets.delete(key);
  }
}, 15 * 60 * 1000);
cleanupTimer.unref?.();

export function rateLimit({
  windowMs = 3600000, // 默认 1 小时窗口
  max = 30,
  message = '操作过于频繁，请稍后再试',
  keyFn = (req) => req.ip
} = {}) {
  return (req, res, next) => {
    const key = keyFn(req);
    const now = Date.now();
    let b = buckets.get(key);
    if (!b || b.resetAt <= now) {
      b = { count: 0, resetAt: now + windowMs };
      buckets.set(key, b);
    }
    b.count += 1;
    if (b.count > max) {
      return res.status(429).json({ error: message });
    }
    next();
  };
}
