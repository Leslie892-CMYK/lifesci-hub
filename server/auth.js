import crypto from 'node:crypto';
import { getDb, commit, nextId } from './db.js';

// 会话有效期（默认 7 天），可用环境变量 SESSION_TTL_DAYS 调整
const SESSION_TTL_MS = (Number(process.env.SESSION_TTL_DAYS) || 7) * 86400000;

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  try {
    const [salt, hash] = String(stored).split(':');
    const test = crypto.scryptSync(String(password), salt, 64);
    const expected = Buffer.from(hash, 'hex');
    return test.length === expected.length && crypto.timingSafeEqual(test, expected);
  } catch {
    return false;
  }
}

export function createSession(userId) {
  const db = getDb();
  const token = crypto.randomBytes(32).toString('hex');
  db.sessions.push({
    token,
    userId,
    createdAt: new Date().toISOString(),
    expiresAt: Date.now() + SESSION_TTL_MS
  });
  commit();
  return token;
}

export function getUserByToken(token) {
  if (!token) return null;
  const db = getDb();
  const s = db.sessions.find((x) => x.token === token);
  if (!s) return null;
  if (s.expiresAt && s.expiresAt < Date.now()) {
    // 会话过期：顺手清理
    db.sessions = db.sessions.filter((x) => x.token !== token);
    commit();
    return null;
  }
  return db.users.find((u) => u.id === s.userId) || null;
}

// 清理全部过期会话（启动时与每日调用）
export function pruneSessions() {
  const db = getDb();
  const now = Date.now();
  const keep = db.sessions.filter((s) => !s.expiresAt || s.expiresAt > now);
  if (keep.length !== db.sessions.length) {
    db.sessions = keep;
    commit();
  }
}

export function publicUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    username: u.username,
    role: u.role,
    bio: u.bio || '',
    color: u.color,
    createdAt: u.createdAt
  };
}

export function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const user = getUserByToken(token);
  if (!user) return res.status(401).json({ error: '请先登录' });
  req.user = user;
  next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: '请先登录' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: '没有权限执行该操作' });
    }
    next();
  };
}
