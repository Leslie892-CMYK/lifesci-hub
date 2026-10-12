import './env.js'; // 必须放在最前：先加载项目根目录 .env 再读取其他模块的环境变量
import express from 'express';
import compression from 'compression'; // gzip 压缩：前端包 300KB → 约 90KB，公网访问明显更快
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { getDb, commit, commitNow, nextId, DATA_FILE, resetDb } from './db.js';
import { buildSeed } from './seed.js';
import { COMPETITION_HUB, competitionEntries } from './seed-competitions.js';
import { runAutoUpdate, backfillTitles } from './updater.js';
import { translationStatus, baiduDoctor } from './translate.js';
import { omSeedData, OM_ROLES, OM_AUTHORSHIP, OM_CLAIM_TYPES, OM_SPONSOR_TYPES } from './seed-om.js';
import { runOphDaily, retranslateAbstracts, REPORTS_DIR, OPH_JOURNAL_GROUPS, OPH_JOURNALS } from './oph.js';
import { rateLimit } from './ratelimit.js';
import { auth, requireRole, hashPassword, verifyPassword, createSession, publicUser, getUserByToken, pruneSessions } from './auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;
const now = () => new Date().toISOString();
const PUBLIC_MODE = process.env.PUBLIC_MODE === '1';

// 首次启动：写入种子数据（公开模式下不生成演示账号）
if (!fs.existsSync(DATA_FILE)) {
  if (PUBLIC_MODE) {
    console.log('[lifesci-hub] 公开模式首次启动：仅写入内容种子（无演示账号），首个注册用户将成为管理员');
  } else {
    console.log('[lifesci-hub] 首次启动，写入演示数据…');
  }
  resetDb(buildSeed({ publicMode: PUBLIC_MODE }));
}

// 公开模式下检测到演示账号时给出安全警告
if (PUBLIC_MODE) {
  const db = getDb();
  const demoNames = ['admin', 'editor', 'synbio_li', 'bio_wang', 'lab_zhang', 'wetlab_chen'];
  const leftover = demoNames.filter((n) => db.users.some((u) => u.username === n));
  if (leftover.length > 0) {
    console.warn(
      `[lifesci-hub][安全警告] 数据库中仍存在演示账号（${leftover.join(', ')}），公开使用前请删除或修改密码！`
    );
  }
}

// 存量数据库迁移：补齐比赛动态模块与「学科竞赛交流」社区（不覆盖已有数据）
function ensureSchema() {
  const db = getDb();
  let changed = false;
  if (!Array.isArray(db.competitions)) {
    db.competitions = [];
    changed = true;
  }
  if (!db.meta || typeof db.meta !== 'object') {
    db.meta = {};
    changed = true;
  }
  if (db.meta.syncing) {
    // 进程重启后不存在进行中的同步，清理残留状态
    db.meta.syncing = false;
    changed = true;
  }
  if (!db.meta.competitionsSeeded) {
    const slugIds = {};
    let hub = db.communities.find((c) => c.slug === COMPETITION_HUB.slug);
    if (!hub) {
      hub = { id: nextId(), ...COMPETITION_HUB, createdBy: 1, createdAt: now() };
      db.communities.push(hub);
      db.memberships.push({ communityId: hub.id, userId: 1, role: 'owner', joinedAt: now() });
    }
    slugIds[COMPETITION_HUB.slug] = hub.id;
    for (const c of db.communities) {
      if (c.slug === 'igem') slugIds.igem = c.id;
      if (c.slug === 'recruitment') slugIds.recruitment = c.id;
    }
    for (const e of competitionEntries(slugIds, 1)) {
      db.competitions.push({ id: nextId(), ...e });
    }
    db.meta.competitionsSeeded = true;
    changed = true;
  }
  if (!Array.isArray(db.omTopics)) {
    db.omTopics = [];
    changed = true;
  }
  if (!Array.isArray(db.intents)) {
    db.intents = [];
    changed = true;
  }
  if (!db.meta.omSeeded) {
    const om = omSeedData();
    const userMap = {};
    for (const u of db.users) userMap[u.username] = u.id;
    const omTopics = om.topics.map((t) => ({
      id: nextId(),
      title: t.title,
      direction: t.direction,
      ownerId: userMap[t.owner] || 0,
      status: t.status,
      description: t.description,
      deliverables: t.deliverables,
      tags: t.tags,
      views: t.views,
      createdAt: t.createdAt
    }));
    const ref = (i) => omTopics[i.topic].id;
    for (const p of om.participations) {
      db.participations.push({
        id: nextId(), topicId: ref(p), userId: userMap[p.user] || 0, role: p.role,
        hoursPerWeek: p.hours, authorshipIntent: p.authorship, note: p.note, status: p.status,
        createdAt: '2026-08-28T08:00:00.000Z'
      });
    }
    for (const c of om.claims) {
      db.claims.push({ id: nextId(), topicId: ref(c), userId: userMap[c.user] || 0, claimType: c.claimType, note: c.note, status: c.status, createdAt: '2026-08-28T09:00:00.000Z' });
    }
    for (const s of om.sponsors) {
      db.sponsors.push({ id: nextId(), topicId: ref(s), userId: userMap[s.user] || 0, sponsorType: s.sponsorType, note: s.note, status: s.status, createdAt: '2026-08-28T10:00:00.000Z' });
    }
    for (const s of om.scores) {
      db.omScores.push({ id: nextId(), topicId: ref(s), userId: userMap[s.user] || 0, score: s.score, createdAt: '2026-08-29T08:00:00.000Z' });
    }
    for (const f of om.follows) {
      db.intents.push({ id: nextId(), topicId: ref(f), userId: userMap[f.user] || 0, type: 'follow', createdAt: '2026-08-27T08:00:00.000Z' });
    }
    db.omTopics.push(...omTopics);
    db.meta.omSeeded = true;
    db.meta.omV2Seeded = true;
    changed = true;
  }
  if (!Array.isArray(db.participations)) {
    db.participations = [];
    changed = true;
  }
  if (!Array.isArray(db.claims)) {
    db.claims = [];
    changed = true;
  }
  if (!Array.isArray(db.sponsors)) {
    db.sponsors = [];
    changed = true;
  }
  if (!Array.isArray(db.omScores)) {
    db.omScores = [];
    changed = true;
  }
  if (!db.meta.omV2Seeded) {
    // v1 → v2 迁移：认领/参与意向 → 参与记录（有配套种子数据的直接使用其分工/署名信息），关注保留；
    // 并为已有主题补齐缺失的新种子记录（认领/资助/评分，按主题标题与用户名匹配）
    const om = omSeedData();
    const seedUserMap = {};
    for (const u of db.users) seedUserMap[u.username] = u.id;
    const topicByTitle = (title) => db.omTopics.find((t) => t.title === title);
    const seedByTU = new Map();
    for (const p of om.participations) seedByTU.set(`${om.topics[p.topic].title}|${p.user}`, p);

    for (const i of db.intents) {
      if (i.type === 'claim' || i.type === 'participate') {
        const t = db.omTopics.find((x) => x.id === i.topicId);
        const u = db.users.find((x) => x.id === i.userId);
        const seed = t && u ? seedByTU.get(`${t.title}|${u.username}`) : null;
        db.participations.push({
          id: nextId(),
          topicId: i.topicId,
          userId: i.userId,
          role: seed?.role || '其他',
          hoursPerWeek: seed?.hours || 0,
          authorshipIntent: seed?.authorship || 'contribution',
          note: seed?.note || '',
          status: seed?.status || 'approved',
          createdAt: i.createdAt || now()
        });
      }
    }
    db.intents = db.intents.filter((i) => i.type === 'follow');

    for (const p of om.participations) {
      const t = topicByTitle(om.topics[p.topic].title);
      const uid = seedUserMap[p.user] || 0;
      if (!t || db.participations.some((x) => x.topicId === t.id && x.userId === uid)) continue;
      db.participations.push({
        id: nextId(), topicId: t.id, userId: uid, role: p.role, hoursPerWeek: p.hours,
        authorshipIntent: p.authorship, note: p.note, status: p.status, createdAt: '2026-08-28T08:00:00.000Z'
      });
    }
    for (const c of om.claims) {
      const t = topicByTitle(om.topics[c.topic].title);
      const uid = seedUserMap[c.user] || 0;
      if (!t || db.claims.some((x) => x.topicId === t.id && x.userId === uid)) continue;
      db.claims.push({ id: nextId(), topicId: t.id, userId: uid, claimType: c.claimType, note: c.note, status: c.status, createdAt: '2026-08-28T09:00:00.000Z' });
    }
    for (const s of om.sponsors) {
      const t = topicByTitle(om.topics[s.topic].title);
      const uid = seedUserMap[s.user] || 0;
      if (!t || db.sponsors.some((x) => x.topicId === t.id && x.userId === uid)) continue;
      db.sponsors.push({ id: nextId(), topicId: t.id, userId: uid, sponsorType: s.sponsorType, note: s.note, status: s.status, createdAt: '2026-08-28T10:00:00.000Z' });
    }
    for (const s of om.scores) {
      const t = topicByTitle(om.topics[s.topic].title);
      const uid = seedUserMap[s.user] || 0;
      if (!t || db.omScores.some((x) => x.topicId === t.id && x.userId === uid)) continue;
      db.omScores.push({ id: nextId(), topicId: t.id, userId: uid, score: s.score, createdAt: '2026-08-29T08:00:00.000Z' });
    }
    // 将历史转换产生的「其他」角色升级为种子数据中的真实分工/署名信息
    for (const p of db.participations) {
      if (p.role !== '其他') continue;
      const t = db.omTopics.find((x) => x.id === p.topicId);
      const u = db.users.find((x) => x.id === p.userId);
      const seed = t && u ? seedByTU.get(`${t.title}|${u.username}`) : null;
      if (seed) {
        p.role = seed.role;
        p.hoursPerWeek = seed.hours;
        p.authorshipIntent = seed.authorship;
        p.note = seed.note || p.note;
        p.status = seed.status || p.status;
      }
    }
    db.meta.omV2Seeded = true;
    changed = true;
  }
  if (changed) commitNow();
}
ensureSchema();
pruneSessions(); // 启动时清理过期会话

const app = express();
app.use(compression()); // 统一开启 gzip（JSON 接口与前端静态资源）
app.use(express.json({ limit: '4mb' }));

// 反向代理（Nginx/Caddy）后获取真实客户端 IP，确保限流按 IP 生效
if (process.env.TRUST_PROXY === '1') {
  app.set('trust proxy', 1);
}

// 基础安全响应头
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// ---------- 限流 ----------
const registerLimit = rateLimit({
  windowMs: 3600000,
  max: Number(process.env.RATE_REGISTER_MAX) || 10,
  message: '注册过于频繁，请一小时后再试'
});
const loginLimit = rateLimit({
  windowMs: 3600000,
  max: Number(process.env.RATE_LOGIN_MAX) || 20,
  message: '登录尝试过于频繁，请稍后再试'
});
const writeLimit = rateLimit({
  windowMs: 3600000,
  max: Number(process.env.RATE_WRITE_MAX) || 120,
  message: '操作过于频繁，请稍后再试',
  keyFn: (req) => `${req.ip}:${optionalUser(req)?.id || 'anon'}`
});

// 写操作（POST/PUT/DELETE）统一限流；认证接口使用更严格的独立限流
app.use((req, res, next) => {
  if (!['POST', 'PUT', 'DELETE'].includes(req.method)) return next();
  if (req.path.startsWith('/api/auth/')) return next();
  if (req.path.startsWith('/api/admin/sync')) return next();
  writeLimit(req, res, next);
});

const CATEGORIES = ['journal', 'tech', 'news'];
const COMMUNITY_TYPES = ['general', 'competition', 'recruitment'];
const POST_TYPES = ['discussion', 'recruit_teammate', 'recruit_member', 'resource'];
const REPO_TYPES = ['skill', 'mcp'];
const REPO_CATEGORIES = ['文献检索', '文献管理', '数据采集', '论文写作', '通用效率', '合集导航'];
const REPO_COLORS = ['#0f8a5f', '#2563eb', '#7c3aed', '#ea580c', '#db2777', '#0d9488'];
const COMP_LEVELS = ['A类', 'B类', 'C类', '校级', '待认定'];
const COMP_STATUSES = ['报名中', '进行中', '即将截止', '已结束'];
const COMP_TYPES = ['学科竞赛', '创新创业', '科研训练', '其他'];

function normalizeTimeline(raw) {
  if (Array.isArray(raw)) {
    return raw
      .map((t) => ({
        label: String(t?.label || '').trim().slice(0, 40),
        date: String(t?.date || '').trim().slice(0, 40)
      }))
      .filter((t) => t.label)
      .slice(0, 12);
  }
  return String(raw || '')
    .split(/\n+/)
    .map((line) => {
      const parts = line.split(/[|｜，,]/).map((s) => s.trim());
      return { label: parts[0] || '', date: parts[1] || '' };
    })
    .filter((t) => t.label)
    .slice(0, 12);
}

// ---------- 通用工具 ----------
function optionalUser(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  return token ? getUserByToken(token) : null;
}

function likeInfo(user, type, id) {
  const db = getDb();
  const count = db.likes.filter((l) => l.targetType === type && l.targetId === id).length;
  const liked = !!user && db.likes.some((l) => l.userId === user.id && l.targetType === type && l.targetId === id);
  return { count, liked };
}

function commentCount(type, id) {
  return getDb().comments.filter((c) => c.targetType === type && c.targetId === id).length;
}

function serializeComment(c) {
  const db = getDb();
  return {
    id: c.id,
    content: c.content,
    parentId: c.parentId || null,
    createdAt: c.createdAt,
    author: publicUser(db.users.find((u) => u.id === c.authorId))
  };
}

function serializeArticle(a, user) {
  const db = getDb();
  return {
    ...a,
    author: publicUser(db.users.find((u) => u.id === a.authorId)),
    likes: likeInfo(user, 'article', a.id).count,
    liked: likeInfo(user, 'article', a.id).liked,
    comments: commentCount('article', a.id)
  };
}

function serializePost(p, user) {
  const db = getDb();
  const community = db.communities.find((c) => c.id === p.communityId);
  return {
    ...p,
    author: publicUser(db.users.find((u) => u.id === p.authorId)),
    community: community
      ? { id: community.id, name: community.name, slug: community.slug, color: community.color }
      : null,
    likes: likeInfo(user, 'post', p.id).count,
    liked: likeInfo(user, 'post', p.id).liked,
    comments: commentCount('post', p.id)
  };
}

function findCommunity(idOrSlug) {
  const db = getDb();
  const asNum = Number(idOrSlug);
  return (
    db.communities.find((c) => c.id === asNum || c.slug === String(idOrSlug)) || null
  );
}

function splitTags(raw) {
  return String(raw || '')
    .split(/[,，\s]+/)
    .map((t) => t.replace(/^#/, '').trim())
    .filter(Boolean)
    .slice(0, 8);
}

function addComment(targetType, targetId, req, res) {
  const db = getDb();
  const content = String(req.body?.content || '').trim();
  if (!content) return res.status(400).json({ error: '评论内容不能为空' });
  if (content.length > 2000) return res.status(400).json({ error: '评论内容过长（最多 2000 字）' });

  let parentId = null;
  if (req.body?.parentId) {
    const parent = db.comments.find(
      (c) => c.id === Number(req.body.parentId) && c.targetType === targetType && c.targetId === targetId
    );
    if (!parent) return res.status(400).json({ error: '回复的评论不存在' });
    parentId = parent.id;
  }

  const comment = {
    id: nextId(),
    targetType,
    targetId,
    authorId: req.user.id,
    content,
    parentId,
    createdAt: now()
  };
  db.comments.push(comment);
  commit();
  res.json({ comment: serializeComment(comment) });
}

// ---------- 认证 ----------
app.post('/api/auth/register', registerLimit, (req, res) => {
  const db = getDb();
  const username = String(req.body?.username || '').trim();
  const password = String(req.body?.password || '');
  const bio = String(req.body?.bio || '').slice(0, 120);

  if (username.length < 2 || username.length > 20) {
    return res.status(400).json({ error: '用户名需为 2-20 个字符' });
  }
  if (!/^[\u4e00-\u9fa5a-zA-Z0-9_-]+$/.test(username)) {
    return res.status(400).json({ error: '用户名仅支持中文、字母、数字、下划线与短横线' });
  }
  if (password.length < 6) return res.status(400).json({ error: '密码至少 6 位' });
  if (db.users.some((u) => u.username === username)) {
    return res.status(409).json({ error: '用户名已被占用' });
  }

  // 公开模式下首个注册账号自动成为管理员（站点开通引导）
  const isFirstUser = db.users.length === 0;
  if (isFirstUser) {
    console.log('[lifesci-hub] 首个注册用户已自动设为管理员，请妥善保管该账号');
  }

  const colors = ['#0f8a5f', '#2563eb', '#7c3aed', '#ea580c', '#db2777', '#0d9488'];
  const user = {
    id: nextId(),
    username,
    passwordHash: hashPassword(password),
    role: isFirstUser ? 'admin' : 'user',
    bio,
    color: colors[Math.floor(Math.random() * colors.length)],
    createdAt: now()
  };
  db.users.push(user);
  commit();
  const token = createSession(user.id);
  res.json({ token, user: publicUser(user) });
});

app.post('/api/auth/login', loginLimit, (req, res) => {
  const db = getDb();
  const username = String(req.body?.username || '').trim();
  const password = String(req.body?.password || '');
  const user = db.users.find((u) => u.username === username);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }
  const token = createSession(user.id);
  res.json({ token, user: publicUser(user) });
});

app.post('/api/auth/change-password', auth, (req, res) => {
  const db = getDb();
  const user = db.users.find((u) => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: '用户不存在' });
  const oldPassword = String(req.body?.oldPassword || '');
  const newPassword = String(req.body?.newPassword || '');
  if (!verifyPassword(oldPassword, user.passwordHash)) {
    return res.status(400).json({ error: '原密码错误' });
  }
  if (newPassword.length < 6) return res.status(400).json({ error: '新密码至少 6 位' });
  user.passwordHash = hashPassword(newPassword);
  commit();
  res.json({ ok: true });
});

app.post('/api/auth/logout', auth, (req, res) => {
  const db = getDb();
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  db.sessions = db.sessions.filter((s) => s.token !== token);
  commit();
  res.json({ ok: true });
});

app.get('/api/auth/me', (req, res) => {
  const user = optionalUser(req);
  res.json({ user: publicUser(user) });
});

// ---------- 统计 ----------
app.get('/api/stats', (req, res) => {
  const db = getDb();
  const todayStr = new Date().toDateString();
  const todayCount = db.articles.filter((a) => new Date(a.publishedAt).toDateString() === todayStr).length;
  res.json({
    articles: db.articles.length,
    communities: db.communities.length,
    posts: db.posts.length,
    users: db.users.length,
    repo: db.repoItems.length,
    competitions: db.competitions.length,
    publicMode: PUBLIC_MODE || db.meta?.publicMode === true,
    todayCount
  });
});

// ---------- 文章 ----------
app.get('/api/articles', (req, res) => {
  const db = getDb();
  const user = optionalUser(req);
  const { category, journal, q, tag, page: pageRaw } = req.query;

  let list = [...db.articles].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  if (category) list = list.filter((a) => a.category === category);
  if (journal) list = list.filter((a) => a.journal === journal);
  if (tag) list = list.filter((a) => (a.tags || []).includes(tag));
  if (q) {
    const s = String(q).toLowerCase();
    list = list.filter((a) =>
      [a.title, a.summary, (a.tags || []).join(' '), a.journal].join(' ').toLowerCase().includes(s)
    );
  }

  const size = Math.min(Math.max(parseInt(req.query.size, 10) || 9, 1), 100);
  const total = list.length;
  const pages = Math.max(1, Math.ceil(total / size));
  const page = Math.min(Math.max(1, parseInt(pageRaw, 10) || 1), pages);
  const items = list.slice((page - 1) * size, page * size).map((a) => serializeArticle(a, user));
  res.json({ items, total, pages, page });
});

app.get('/api/articles/:id', (req, res) => {
  const db = getDb();
  const user = optionalUser(req);
  const article = db.articles.find((a) => a.id === Number(req.params.id));
  if (!article) return res.status(404).json({ error: '文章不存在' });

  article.views += 1;
  commit();

  const comments = db.comments
    .filter((c) => c.targetType === 'article' && c.targetId === article.id)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map(serializeComment);

  res.json({ article: serializeArticle(article, user), comments });
});

app.post('/api/articles', auth, requireRole('admin', 'editor'), (req, res) => {
  const db = getDb();
  const { title, category, journal, authors, doi, tags, summary, content } = req.body || {};

  if (!title?.trim() || !summary?.trim() || !content?.trim()) {
    return res.status(400).json({ error: '标题、摘要与正文不能为空' });
  }
  if (!CATEGORIES.includes(category)) return res.status(400).json({ error: '栏目不合法' });

  const article = {
    id: nextId(),
    title: title.trim(),
    summary: summary.trim(),
    content: content.trim(),
    category,
    journal: String(journal || '').trim(),
    authors: String(authors || '').trim(),
    doi: String(doi || '').trim(),
    tags: splitTags(tags),
    publishedAt: now(),
    authorId: req.user.id,
    views: 0
  };
  db.articles.push(article);
  commit();
  res.json({ article: serializeArticle(article, req.user) });
});

app.put('/api/articles/:id', auth, requireRole('admin', 'editor'), (req, res) => {
  const db = getDb();
  const article = db.articles.find((a) => a.id === Number(req.params.id));
  if (!article) return res.status(404).json({ error: '文章不存在' });

  const { title, category, journal, authors, doi, tags, summary, content } = req.body || {};
  if (!title?.trim() || !summary?.trim() || !content?.trim()) {
    return res.status(400).json({ error: '标题、摘要与正文不能为空' });
  }
  if (!CATEGORIES.includes(category)) return res.status(400).json({ error: '栏目不合法' });

  article.title = title.trim();
  article.summary = summary.trim();
  article.content = content.trim();
  article.category = category;
  article.journal = String(journal || '').trim();
  article.authors = String(authors || '').trim();
  article.doi = String(doi || '').trim();
  article.tags = splitTags(tags);
  commit();
  res.json({ article: serializeArticle(article, req.user) });
});

app.delete('/api/articles/:id', auth, requireRole('admin'), (req, res) => {
  const db = getDb();
  const article = db.articles.find((a) => a.id === Number(req.params.id));
  if (!article) return res.status(404).json({ error: '文章不存在' });
  db.articles = db.articles.filter((a) => a.id !== article.id);
  db.comments = db.comments.filter((c) => !(c.targetType === 'article' && c.targetId === article.id));
  db.likes = db.likes.filter((l) => !(l.targetType === 'article' && l.targetId === article.id));
  commit();
  res.json({ ok: true });
});

app.post('/api/articles/:id/like', auth, (req, res) => {
  const db = getDb();
  const article = db.articles.find((a) => a.id === Number(req.params.id));
  if (!article) return res.status(404).json({ error: '文章不存在' });

  const idx = db.likes.findIndex(
    (l) => l.userId === req.user.id && l.targetType === 'article' && l.targetId === article.id
  );
  if (idx >= 0) db.likes.splice(idx, 1);
  else db.likes.push({ userId: req.user.id, targetType: 'article', targetId: article.id });
  commit();
  res.json(likeInfo(req.user, 'article', article.id));
});

app.post('/api/articles/:id/comments', auth, (req, res) => {
  const db = getDb();
  const article = db.articles.find((a) => a.id === Number(req.params.id));
  if (!article) return res.status(404).json({ error: '文章不存在' });
  addComment('article', article.id, req, res);
});

// ---------- 社区 ----------
app.get('/api/communities', (req, res) => {
  const db = getDb();
  const user = optionalUser(req);
  const items = db.communities
    .map((c) => {
      const members = db.memberships.filter((m) => m.communityId === c.id).length;
      const posts = db.posts.filter((p) => p.communityId === c.id).length;
      const owner = db.users.find((u) => u.id === c.createdBy);
      const joined = !!user && db.memberships.some((m) => m.communityId === c.id && m.userId === user.id);
      return { ...c, members, posts, joined, ownerName: owner?.username || '' };
    })
    .sort((a, b) => b.posts - a.posts);
  res.json(items);
});

app.post('/api/communities', auth, (req, res) => {
  const db = getDb();
  const name = String(req.body?.name || '').trim();
  const slug = String(req.body?.slug || '').trim().toLowerCase();
  const description = String(req.body?.description || '').trim();
  const type = req.body?.type;
  const color = /^#[0-9a-fA-F]{6}$/.test(String(req.body?.color || '')) ? req.body.color : '#0f8a5f';

  if (name.length < 2 || name.length > 30) return res.status(400).json({ error: '社区名称需为 2-30 个字符' });
  if (!/^[a-z0-9-]{2,40}$/.test(slug)) return res.status(400).json({ error: '英文标识需为 2-40 位小写字母/数字/连字符' });
  if (!COMMUNITY_TYPES.includes(type)) return res.status(400).json({ error: '社区类型不合法' });
  if (db.communities.some((c) => c.slug === slug)) return res.status(409).json({ error: '该英文标识已被使用' });

  const community = {
    id: nextId(),
    name,
    slug,
    description: description.slice(0, 200),
    type,
    color,
    createdBy: req.user.id,
    createdAt: now()
  };
  db.communities.push(community);
  db.memberships.push({ communityId: community.id, userId: req.user.id, role: 'owner', joinedAt: now() });
  commit();
  res.json(community);
});

app.get('/api/communities/:id', (req, res) => {
  const db = getDb();
  const user = optionalUser(req);
  const community = findCommunity(req.params.id);
  if (!community) return res.status(404).json({ error: '社区不存在' });

  const posts = db.posts
    .filter((p) => p.communityId === community.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((p) => serializePost(p, user));
  const memberCount = db.memberships.filter((m) => m.communityId === community.id).length;
  const joined = !!user && db.memberships.some((m) => m.communityId === community.id && m.userId === user.id);
  const owner = db.users.find((u) => u.id === community.createdBy);

  res.json({ ...community, owner: publicUser(owner), memberCount, joined, posts });
});

app.post('/api/communities/:id/join', auth, (req, res) => {
  const db = getDb();
  const community = findCommunity(req.params.id);
  if (!community) return res.status(404).json({ error: '社区不存在' });

  const idx = db.memberships.findIndex(
    (m) => m.communityId === community.id && m.userId === req.user.id
  );
  let joined;
  if (idx >= 0) {
    db.memberships.splice(idx, 1);
    joined = false;
  } else {
    db.memberships.push({ communityId: community.id, userId: req.user.id, role: 'member', joinedAt: now() });
    joined = true;
  }
  commit();
  res.json({ joined, memberCount: db.memberships.filter((m) => m.communityId === community.id).length });
});

app.put('/api/communities/:id', auth, requireRole('admin'), (req, res) => {
  const db = getDb();
  const community = findCommunity(req.params.id);
  if (!community) return res.status(404).json({ error: '社区不存在' });

  const name = String(req.body?.name || '').trim();
  const description = String(req.body?.description || '').trim();
  const type = req.body?.type;
  const color = /^#[0-9a-fA-F]{6}$/.test(String(req.body?.color || '')) ? req.body.color : community.color;

  if (name.length < 2 || name.length > 30) return res.status(400).json({ error: '社区名称需为 2-30 个字符' });
  if (!COMMUNITY_TYPES.includes(type)) return res.status(400).json({ error: '社区类型不合法' });

  community.name = name;
  community.description = description.slice(0, 200);
  community.type = type;
  community.color = color;
  commit();
  res.json(community);
});

app.delete('/api/communities/:id', auth, requireRole('admin'), (req, res) => {
  const db = getDb();
  const community = findCommunity(req.params.id);
  if (!community) return res.status(404).json({ error: '社区不存在' });

  const postIds = db.posts.filter((p) => p.communityId === community.id).map((p) => p.id);
  db.posts = db.posts.filter((p) => p.communityId !== community.id);
  db.comments = db.comments.filter((c) => !(c.targetType === 'post' && postIds.includes(c.targetId)));
  db.likes = db.likes.filter((l) => !(l.targetType === 'post' && postIds.includes(l.targetId)));
  db.memberships = db.memberships.filter((m) => m.communityId !== community.id);
  db.communities = db.communities.filter((c) => c.id !== community.id);
  commit();
  res.json({ ok: true });
});

// ---------- 帖子 ----------
app.post('/api/communities/:id/posts', auth, (req, res) => {
  const db = getDb();
  const community = findCommunity(req.params.id);
  if (!community) return res.status(404).json({ error: '社区不存在' });

  const title = String(req.body?.title || '').trim();
  const content = String(req.body?.content || '').trim();
  const type = req.body?.type;

  if (!title) return res.status(400).json({ error: '标题不能为空' });
  if (title.length > 80) return res.status(400).json({ error: '标题最多 80 字' });
  if (!content) return res.status(400).json({ error: '内容不能为空' });
  if (content.length > 10000) return res.status(400).json({ error: '内容最多 10000 字' });
  if (!POST_TYPES.includes(type)) return res.status(400).json({ error: '帖子类型不合法' });

  const post = {
    id: nextId(),
    communityId: community.id,
    authorId: req.user.id,
    type,
    title,
    content,
    tags: splitTags(req.body?.tags),
    createdAt: now()
  };
  db.posts.push(post);
  commit();
  res.json({ post: serializePost(post, req.user) });
});

app.get('/api/posts/:id', (req, res) => {
  const db = getDb();
  const user = optionalUser(req);
  const post = db.posts.find((p) => p.id === Number(req.params.id));
  if (!post) return res.status(404).json({ error: '帖子不存在' });

  const comments = db.comments
    .filter((c) => c.targetType === 'post' && c.targetId === post.id)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map(serializeComment);

  res.json({ post: serializePost(post, user), comments });
});

app.post('/api/posts/:id/like', auth, (req, res) => {
  const db = getDb();
  const post = db.posts.find((p) => p.id === Number(req.params.id));
  if (!post) return res.status(404).json({ error: '帖子不存在' });

  const idx = db.likes.findIndex(
    (l) => l.userId === req.user.id && l.targetType === 'post' && l.targetId === post.id
  );
  if (idx >= 0) db.likes.splice(idx, 1);
  else db.likes.push({ userId: req.user.id, targetType: 'post', targetId: post.id });
  commit();
  res.json(likeInfo(req.user, 'post', post.id));
});

app.post('/api/posts/:id/comments', auth, (req, res) => {
  const db = getDb();
  const post = db.posts.find((p) => p.id === Number(req.params.id));
  if (!post) return res.status(404).json({ error: '帖子不存在' });
  addComment('post', post.id, req, res);
});

app.delete('/api/posts/:id', auth, requireRole('admin'), (req, res) => {
  const db = getDb();
  const post = db.posts.find((p) => p.id === Number(req.params.id));
  if (!post) return res.status(404).json({ error: '帖子不存在' });
  db.posts = db.posts.filter((p) => p.id !== post.id);
  db.comments = db.comments.filter((c) => !(c.targetType === 'post' && c.targetId === post.id));
  db.likes = db.likes.filter((l) => !(l.targetType === 'post' && l.targetId === post.id));
  commit();
  res.json({ ok: true });
});

app.delete('/api/comments/:id', auth, (req, res) => {
  const db = getDb();
  const comment = db.comments.find((c) => c.id === Number(req.params.id));
  if (!comment) return res.status(404).json({ error: '评论不存在' });
  if (req.user.role !== 'admin' && comment.authorId !== req.user.id) {
    return res.status(403).json({ error: '没有权限删除该评论' });
  }
  db.comments = db.comments.filter((c) => c.id !== comment.id && !(c.parentId === comment.id));
  commit();
  res.json({ ok: true });
});

// ---------- 招募聚合 ----------
app.get('/api/recruit', (req, res) => {
  const db = getDb();
  const user = optionalUser(req);
  const { type } = req.query;

  let list = db.posts.filter((p) => p.type === 'recruit_teammate' || p.type === 'recruit_member');
  if (type === 'recruit_teammate' || type === 'recruit_member') {
    list = list.filter((p) => p.type === type);
  }
  list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  res.json({ items: list.map((p) => serializePost(p, user)) });
});

// ---------- 比赛动态 ----------
function serializeCompetition(c, user) {
  const db = getDb();
  const community = c.communityId ? db.communities.find((x) => x.id === c.communityId) : null;
  return {
    ...c,
    community: community
      ? { id: community.id, name: community.name, slug: community.slug, color: community.color }
      : null,
    author: c.authorId ? publicUser(db.users.find((u) => u.id === c.authorId)) : null,
    comments: commentCount('competition', c.id)
  };
}

function competitionPayload(req, fallback = {}) {
  const b = req.body || {};
  return {
    title: String(b.title || fallback.title || '').trim().slice(0, 120),
    source: String(b.source || fallback.source || '编辑发布').trim().slice(0, 20),
    sourceUrl: String(b.sourceUrl || fallback.sourceUrl || '').trim(),
    organizer: String(b.organizer || fallback.organizer || '').trim().slice(0, 120),
    type: COMP_TYPES.includes(b.type) ? b.type : fallback.type || '学科竞赛',
    catalogLevel: COMP_LEVELS.includes(b.catalogLevel) ? b.catalogLevel : fallback.catalogLevel || '待认定',
    level: String(b.level || fallback.level || '国家级').trim().slice(0, 20),
    star: Math.min(Math.max(parseInt(b.star, 10) || fallback.star || 3, 1), 5),
    intro: String(b.intro || fallback.intro || '').trim().slice(0, 500),
    timeline: normalizeTimeline(b.timeline ?? fallback.timeline ?? []),
    submission: String(b.submission || fallback.submission || '').trim().slice(0, 2000),
    deadline: b.deadline ? String(b.deadline).trim().slice(0, 10) : fallback.deadline || null,
    status: COMP_STATUSES.includes(b.status) ? b.status : fallback.status || '进行中',
    tags: b.tags !== undefined ? splitTags(b.tags) : fallback.tags || [],
    communityId: b.communityId ? Number(b.communityId) : fallback.communityId || null,
    content: String(b.content || fallback.content || '').trim().slice(0, 10000)
  };
}

app.get('/api/competitions', (req, res) => {
  const db = getDb();
  const user = optionalUser(req);
  const { status, level, q, page: pageRaw } = req.query;

  let list = [...db.competitions].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  if (status) list = list.filter((c) => c.status === status);
  if (level) list = list.filter((c) => c.catalogLevel === level);
  if (q) {
    const s = String(q).toLowerCase();
    list = list.filter((c) =>
      [c.title, c.intro, c.organizer, (c.tags || []).join(' ')].join(' ').toLowerCase().includes(s)
    );
  }

  const size = Math.min(Math.max(parseInt(req.query.size, 10) || 9, 1), 100);
  const total = list.length;
  const pages = Math.max(1, Math.ceil(total / size));
  const page = Math.min(Math.max(1, parseInt(pageRaw, 10) || 1), pages);
  res.json({
    items: list.slice((page - 1) * size, page * size).map((c) => serializeCompetition(c, user)),
    total,
    pages,
    page
  });
});

app.get('/api/competitions/:id', (req, res) => {
  const db = getDb();
  const user = optionalUser(req);
  const comp = db.competitions.find((c) => c.id === Number(req.params.id));
  if (!comp) return res.status(404).json({ error: '比赛信息不存在' });

  comp.views += 1;
  commit();

  const comments = db.comments
    .filter((c) => c.targetType === 'competition' && c.targetId === comp.id)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map(serializeComment);

  res.json({ competition: serializeCompetition(comp, user), comments });
});

app.post('/api/competitions', auth, requireRole('admin', 'editor'), (req, res) => {
  const db = getDb();
  const payload = competitionPayload(req);
  if (!payload.title || !payload.intro) return res.status(400).json({ error: '标题与比赛介绍不能为空' });

  const comp = {
    id: nextId(),
    ...payload,
    publishedAt: now(),
    authorId: req.user.id,
    views: 0
  };
  db.competitions.push(comp);
  commit();
  res.json({ competition: serializeCompetition(comp, req.user) });
});

app.put('/api/competitions/:id', auth, requireRole('admin', 'editor'), (req, res) => {
  const db = getDb();
  const comp = db.competitions.find((c) => c.id === Number(req.params.id));
  if (!comp) return res.status(404).json({ error: '比赛信息不存在' });
  const payload = competitionPayload(req, comp);
  if (!payload.title || !payload.intro) return res.status(400).json({ error: '标题与比赛介绍不能为空' });
  Object.assign(comp, payload);
  commit();
  res.json({ competition: serializeCompetition(comp, req.user) });
});

app.delete('/api/competitions/:id', auth, requireRole('admin'), (req, res) => {
  const db = getDb();
  const comp = db.competitions.find((c) => c.id === Number(req.params.id));
  if (!comp) return res.status(404).json({ error: '比赛信息不存在' });
  db.competitions = db.competitions.filter((c) => c.id !== comp.id);
  db.comments = db.comments.filter((c) => !(c.targetType === 'competition' && c.targetId === comp.id));
  commit();
  res.json({ ok: true });
});

app.post('/api/competitions/:id/comments', auth, (req, res) => {
  const db = getDb();
  const comp = db.competitions.find((c) => c.id === Number(req.params.id));
  if (!comp) return res.status(404).json({ error: '比赛信息不存在' });
  addComment('competition', comp.id, req, res);
});

// ---------- 精选仓库（Skill & MCP） ----------
function serializeRepoItem(r, user) {
  const db = getDb();
  const fav = likeInfo(user, 'repo', r.id);
  return {
    ...r,
    downloads: r.downloadCount,
    favorites: fav.count,
    favorited: fav.liked,
    submittedBy: r.authorId ? publicUser(db.users.find((u) => u.id === r.authorId)) : null
  };
}

app.get('/api/repo', (req, res) => {
  const db = getDb();
  const user = optionalUser(req);
  const { type, category, q, page: pageRaw } = req.query;

  let list = [...db.repoItems].sort((a, b) => b.stars - a.stars);
  if (type) list = list.filter((r) => r.type === type);
  if (category) list = list.filter((r) => r.category === category);
  if (q) {
    const s = String(q).toLowerCase();
    list = list.filter((r) =>
      [r.name, r.summary, r.author, r.category, (r.tags || []).join(' ')].join(' ').toLowerCase().includes(s)
    );
  }

  const size = Math.min(Math.max(parseInt(req.query.size, 10) || 9, 1), 100);
  const total = list.length;
  const pages = Math.max(1, Math.ceil(total / size));
  const page = Math.min(Math.max(1, parseInt(pageRaw, 10) || 1), pages);
  res.json({
    items: list.slice((page - 1) * size, page * size).map((r) => serializeRepoItem(r, user)),
    total,
    pages,
    page
  });
});

app.get('/api/repo/:id', (req, res) => {
  const db = getDb();
  const user = optionalUser(req);
  const item = db.repoItems.find((r) => r.id === Number(req.params.id));
  if (!item) return res.status(404).json({ error: '该工具不存在' });

  item.views += 1;
  commit();

  let related = db.repoItems.filter((r) => r.id !== item.id && r.category === item.category);
  if (related.length < 3) {
    const more = db.repoItems.filter((r) => r.id !== item.id && r.type === item.type && !related.includes(r));
    related = [...related, ...more];
  }
  related = related.slice(0, 3).map((r) => serializeRepoItem(r, user));
  res.json({ item: serializeRepoItem(item, user), related });
});

app.post('/api/repo', auth, (req, res) => {
  const db = getDb();
  const {
    type, name, author, category, tags, logo, summary,
    description, highlights, install, usage, homepage, downloadUrl
  } = req.body || {};

  if (!name?.trim() || !summary?.trim() || !description?.trim()) {
    return res.status(400).json({ error: '名称、简介与详细介绍不能为空' });
  }
  if (!REPO_TYPES.includes(type)) return res.status(400).json({ error: '工具类型不合法' });
  if (!REPO_CATEGORIES.includes(category)) return res.status(400).json({ error: '分类不合法' });
  if (!/^https?:\/\//.test(String(downloadUrl || ''))) {
    return res.status(400).json({ error: '下载地址需以 http(s):// 开头' });
  }
  if (homepage && !/^https?:\/\//.test(String(homepage))) {
    return res.status(400).json({ error: '主页地址需以 http(s):// 开头' });
  }

  const item = {
    id: nextId(),
    type,
    name: name.trim().slice(0, 60),
    author: String(author || '').trim().slice(0, 40) || req.user.username,
    category,
    tags: splitTags(tags),
    logo: String(logo || '').trim().slice(0, 4) || '🧰',
    color: REPO_COLORS[Math.floor(Math.random() * REPO_COLORS.length)],
    summary: summary.trim().slice(0, 300),
    description: description.trim(),
    highlights: String(highlights || '')
      .split(/\n+/)
      .map((s) => s.replace(/^[-*•]\s*/, '').trim())
      .filter(Boolean)
      .slice(0, 10),
    install: String(install || '').trim(),
    usage: String(usage || '').trim(),
    homepage: String(homepage || '').trim(),
    downloadUrl: String(downloadUrl).trim(),
    stars: 0,
    downloadCount: 0,
    views: 0,
    createdAt: now(),
    authorId: req.user.id
  };
  db.repoItems.push(item);
  commit();
  res.json({ item: serializeRepoItem(item, req.user) });
});

app.put('/api/repo/:id', auth, requireRole('admin'), (req, res) => {
  const db = getDb();
  const item = db.repoItems.find((r) => r.id === Number(req.params.id));
  if (!item) return res.status(404).json({ error: '该工具不存在' });

  const {
    type, name, author, category, tags, logo, summary,
    description, highlights, install, usage, homepage, downloadUrl
  } = req.body || {};

  if (!name?.trim() || !summary?.trim() || !description?.trim()) {
    return res.status(400).json({ error: '名称、简介与详细介绍不能为空' });
  }
  if (!REPO_TYPES.includes(type)) return res.status(400).json({ error: '工具类型不合法' });
  if (!REPO_CATEGORIES.includes(category)) return res.status(400).json({ error: '分类不合法' });
  if (!/^https?:\/\//.test(String(downloadUrl || ''))) {
    return res.status(400).json({ error: '下载地址需以 http(s):// 开头' });
  }
  if (homepage && !/^https?:\/\//.test(String(homepage))) {
    return res.status(400).json({ error: '主页地址需以 http(s):// 开头' });
  }

  item.type = type;
  item.name = name.trim().slice(0, 60);
  item.author = String(author || '').trim().slice(0, 40) || item.author;
  item.category = category;
  item.tags = splitTags(tags);
  item.logo = String(logo || '').trim().slice(0, 4) || item.logo;
  item.summary = summary.trim().slice(0, 300);
  item.description = description.trim();
  item.highlights = String(highlights || '')
    .split(/\n+/)
    .map((s) => s.replace(/^[-*•]\s*/, '').trim())
    .filter(Boolean)
    .slice(0, 10);
  item.install = String(install || '').trim();
  item.usage = String(usage || '').trim();
  item.homepage = String(homepage || '').trim();
  item.downloadUrl = String(downloadUrl).trim();
  commit();
  res.json({ item: serializeRepoItem(item, req.user) });
});

app.post('/api/repo/:id/download', (req, res) => {
  const db = getDb();
  const item = db.repoItems.find((r) => r.id === Number(req.params.id));
  if (!item) return res.status(404).json({ error: '该工具不存在' });
  item.downloadCount += 1;
  commit();
  res.json({ downloadCount: item.downloadCount, downloadUrl: item.downloadUrl });
});

app.post('/api/repo/:id/favorite', auth, (req, res) => {
  const db = getDb();
  const item = db.repoItems.find((r) => r.id === Number(req.params.id));
  if (!item) return res.status(404).json({ error: '该工具不存在' });
  const idx = db.likes.findIndex(
    (l) => l.userId === req.user.id && l.targetType === 'repo' && l.targetId === item.id
  );
  if (idx >= 0) db.likes.splice(idx, 1);
  else db.likes.push({ userId: req.user.id, targetType: 'repo', targetId: item.id });
  commit();
  res.json(likeInfo(req.user, 'repo', item.id));
});

app.delete('/api/repo/:id', auth, requireRole('admin'), (req, res) => {
  const db = getDb();
  const item = db.repoItems.find((r) => r.id === Number(req.params.id));
  if (!item) return res.status(404).json({ error: '该工具不存在' });
  db.repoItems = db.repoItems.filter((r) => r.id !== item.id);
  db.likes = db.likes.filter((l) => !(l.targetType === 'repo' && l.targetId === item.id));
  commit();
  res.json({ ok: true });
});

// ---------- 管理后台 ----------
app.get('/api/admin/stats', auth, requireRole('admin'), (req, res) => {
  const db = getDb();
  const todayStr = new Date().toDateString();
  const counts = {
    articles: db.articles.length,
    communities: db.communities.length,
    posts: db.posts.length,
    comments: db.comments.length,
    repo: db.repoItems.length,
    competitions: db.competitions.length,
    om: db.omTopics.length,
    users: db.users.length,
    todayArticles: db.articles.filter((a) => new Date(a.publishedAt).toDateString() === todayStr).length
  };
  const recentArticles = [...db.articles]
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, 5)
    .map((a) => ({ id: a.id, title: a.title, category: a.category, publishedAt: a.publishedAt }));
  const recentPosts = [...db.posts]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5)
    .map((p) => ({
      id: p.id,
      title: p.title,
      type: p.type,
      createdAt: p.createdAt,
      authorName: db.users.find((u) => u.id === p.authorId)?.username || '用户',
      communityName: db.communities.find((c) => c.id === p.communityId)?.name || ''
    }));
  const recentUsers = [...db.users]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5)
    .map(publicUser);
  res.json({ counts, recentArticles, recentPosts, recentUsers });
});

app.get('/api/admin/users', auth, requireRole('admin'), (req, res) => {
  const db = getDb();
  const items = db.users
    .map((u) => ({
      ...publicUser(u),
      posts: db.posts.filter((p) => p.authorId === u.id).length,
      comments: db.comments.filter((c) => c.authorId === u.id).length
    }))
    .sort((a, b) => a.id - b.id);
  res.json({ items });
});

app.put('/api/admin/users/:id/role', auth, requireRole('admin'), (req, res) => {
  const db = getDb();
  const target = db.users.find((u) => u.id === Number(req.params.id));
  if (!target) return res.status(404).json({ error: '用户不存在' });
  const role = req.body?.role;
  if (!['user', 'editor', 'admin'].includes(role)) return res.status(400).json({ error: '角色不合法' });
  if (target.id === req.user.id) return res.status(400).json({ error: '不能修改自己的角色' });
  const adminCount = db.users.filter((u) => u.role === 'admin').length;
  if (target.role === 'admin' && role !== 'admin' && adminCount <= 1) {
    return res.status(400).json({ error: '至少需要保留一名管理员' });
  }
  target.role = role;
  commit();
  res.json({ user: publicUser(target) });
});

app.delete('/api/admin/users/:id', auth, requireRole('admin'), (req, res) => {
  const db = getDb();
  const target = db.users.find((u) => u.id === Number(req.params.id));
  if (!target) return res.status(404).json({ error: '用户不存在' });
  if (target.id === req.user.id) return res.status(400).json({ error: '不能删除自己的账号' });
  const adminCount = db.users.filter((u) => u.role === 'admin').length;
  if (target.role === 'admin' && adminCount <= 1) {
    return res.status(400).json({ error: '至少需要保留一名管理员' });
  }

  const postIds = db.posts.filter((p) => p.authorId === target.id).map((p) => p.id);
  db.sessions = db.sessions.filter((s) => s.userId !== target.id);
  db.posts = db.posts.filter((p) => p.authorId !== target.id);
  db.comments = db.comments.filter(
    (c) => c.authorId !== target.id && !(c.targetType === 'post' && postIds.includes(c.targetId))
  );
  db.likes = db.likes.filter(
    (l) => l.userId !== target.id && !(l.targetType === 'post' && postIds.includes(l.targetId))
  );
  db.memberships = db.memberships.filter((m) => m.userId !== target.id);
  db.users = db.users.filter((u) => u.id !== target.id);
  commit();
  res.json({ ok: true });
});

app.get('/api/admin/posts', auth, requireRole('admin'), (req, res) => {
  const db = getDb();
  const items = [...db.posts]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((p) => {
      const community = db.communities.find((c) => c.id === p.communityId);
      const author = db.users.find((u) => u.id === p.authorId);
      return {
        id: p.id,
        title: p.title,
        type: p.type,
        tags: p.tags,
        createdAt: p.createdAt,
        author: publicUser(author),
        community: community ? { id: community.id, name: community.name } : null,
        comments: commentCount('post', p.id)
      };
    });
  res.json({ items });
});

app.get('/api/admin/comments', auth, requireRole('admin'), (req, res) => {
  const db = getDb();
  const items = [...db.comments]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((c) => {
      const author = db.users.find((u) => u.id === c.authorId);
      let targetTitle = '（内容已删除）';
      if (c.targetType === 'article') {
        const a = db.articles.find((x) => x.id === c.targetId);
        if (a) targetTitle = a.title;
      } else {
        const p = db.posts.find((x) => x.id === c.targetId);
        if (p) targetTitle = p.title;
      }
      return {
        id: c.id,
        content: c.content,
        createdAt: c.createdAt,
        targetType: c.targetType,
        targetId: c.targetId,
        targetTitle,
        author: publicUser(author)
      };
    });
  res.json({ items });
});

// ---------- OpenMedAI 医学 AI 协作模块 ----------
const OM_DIRECTIONS = ['医学影像AI', '医疗NLP', 'AI药物发现', '知识工程', '组学数据', '临床AI', '其他'];
const OM_STATUSES = ['招募中', '进行中', '已完成'];

function omCollection(kind) {
  const db = getDb();
  if (kind === 'participation') return db.participations;
  if (kind === 'claim') return db.claims;
  if (kind === 'sponsor') return db.sponsors;
  return [];
}

function omTopicStats(topicId) {
  const db = getDb();
  const parts = db.participations.filter((p) => p.topicId === topicId);
  const claims = db.claims.filter((c) => c.topicId === topicId);
  const sponsors = db.sponsors.filter((s) => s.topicId === topicId);
  const scores = db.omScores.filter((s) => s.topicId === topicId);
  return {
    follows: db.intents.filter((i) => i.topicId === topicId).length,
    participations: parts.length,
    participants: parts.filter((p) => p.status === 'approved').length,
    pendingParticipations: parts.filter((p) => p.status === 'pending').length,
    claims: claims.length,
    approvedClaims: claims.filter((c) => c.status === 'approved').length,
    pendingClaims: claims.filter((c) => c.status === 'pending').length,
    sponsors: sponsors.length,
    approvedSponsors: sponsors.filter((s) => s.status === 'approved').length,
    pendingSponsors: sponsors.filter((s) => s.status === 'pending').length,
    scores: scores.length,
    avgScore: scores.length ? Math.round((scores.reduce((a, s) => a + s.score, 0) / scores.length) * 10) / 10 : null
  };
}

function myOmState(user, topicId) {
  if (!user) return null;
  const db = getDb();
  const p = db.participations.find((x) => x.topicId === topicId && x.userId === user.id);
  const c = db.claims.find((x) => x.topicId === topicId && x.userId === user.id);
  const s = db.sponsors.find((x) => x.topicId === topicId && x.userId === user.id);
  const sc = db.omScores.find((x) => x.topicId === topicId && x.userId === user.id);
  return {
    followed: db.intents.some((i) => i.topicId === topicId && i.userId === user.id),
    participation: p ? { id: p.id, status: p.status, role: p.role, hoursPerWeek: p.hoursPerWeek, authorshipIntent: p.authorshipIntent, note: p.note } : null,
    claim: c ? { id: c.id, status: c.status, claimType: c.claimType, note: c.note } : null,
    sponsor: s ? { id: s.id, status: s.status, sponsorType: s.sponsorType, note: s.note } : null,
    score: sc ? sc.score : null
  };
}

function serializeOmRecord(r) {
  const db = getDb();
  return { ...r, user: publicUser(db.users.find((u) => u.id === r.userId)) };
}

function serializeOmTopic(t, user) {
  return {
    ...t,
    owner: publicUser(getDb().users.find((u) => u.id === t.ownerId)),
    ...omTopicStats(t.id),
    my: myOmState(user, t.id)
  };
}

function omPoints(userId) {
  const db = getDb();
  let p = db.omTopics.filter((t) => t.ownerId === userId).length * 20;
  p += db.intents.filter((x) => x.userId === userId).length * 2;
  for (const x of db.participations.filter((x) => x.userId === userId)) p += x.status === 'approved' ? 10 : 5;
  for (const x of db.claims.filter((x) => x.userId === userId)) p += x.status === 'approved' ? 15 : 8;
  for (const x of db.sponsors.filter((x) => x.userId === userId)) p += x.status === 'approved' ? 10 : 5;
  p += db.omScores.filter((x) => x.userId === userId).length * 3;
  return p;
}

function omLeaderboard() {
  const db = getDb();
  const points = new Map();
  for (const u of db.users) points.set(u.id, omPoints(u.id));
  return [...points.entries()]
    .map(([id, p]) => ({ user: publicUser(db.users.find((u) => u.id === id)), points: p }))
    .filter((x) => x.user && x.points > 0)
    .sort((a, b) => b.points - a.points)
    .slice(0, 5);
}

app.get('/api/om/topics', (req, res) => {
  const db = getDb();
  const user = optionalUser(req);
  const items = [...db.omTopics]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((t) => serializeOmTopic(t, user));
  res.json({ items, leaderboard: omLeaderboard(), myPoints: user ? omPoints(user.id) : null });
});

app.get('/api/om/topics/:id', (req, res) => {
  const db = getDb();
  const user = optionalUser(req);
  const topic = db.omTopics.find((t) => t.id === Number(req.params.id));
  if (!topic) return res.status(404).json({ error: '主题不存在' });

  topic.views += 1;
  commit();

  const isManager = user && (topic.ownerId === user.id || user.role === 'admin' || user.role === 'editor');
  const team = db.participations
    .filter((p) => p.topicId === topic.id && p.status === 'approved')
    .map(serializeOmRecord);
  const approvedClaims = db.claims
    .filter((c) => c.topicId === topic.id && c.status === 'approved')
    .map(serializeOmRecord);
  const approvedSponsors = db.sponsors
    .filter((s) => s.topicId === topic.id && s.status === 'approved')
    .map(serializeOmRecord);
  const pending = isManager
    ? {
        participations: db.participations.filter((p) => p.topicId === topic.id && p.status === 'pending').map(serializeOmRecord),
        claims: db.claims.filter((c) => c.topicId === topic.id && c.status === 'pending').map(serializeOmRecord),
        sponsors: db.sponsors.filter((s) => s.topicId === topic.id && s.status === 'pending').map(serializeOmRecord)
      }
    : null;
  const scores = db.omScores
    .filter((s) => s.topicId === topic.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 10)
    .map(serializeOmRecord);

  res.json({
    topic: serializeOmTopic(topic, user),
    team,
    approvedClaims,
    approvedSponsors,
    pending,
    scores,
    leaderboard: omLeaderboard(),
    myPoints: user ? omPoints(user.id) : null,
    isManager
  });
});

app.post('/api/om/topics', auth, (req, res) => {
  const db = getDb();
  const title = String(req.body?.title || '').trim();
  const direction = req.body?.direction;
  const description = String(req.body?.description || '').trim();
  const deliverables = String(req.body?.deliverables || '').trim();
  const status = OM_STATUSES.includes(req.body?.status) ? req.body.status : '招募中';

  if (!title || title.length < 2 || title.length > 60) return res.status(400).json({ error: '主题标题需为 2-60 个字符' });
  if (!OM_DIRECTIONS.includes(direction)) return res.status(400).json({ error: '研究方向不合法' });
  if (!description) return res.status(400).json({ error: '主题描述不能为空' });
  if (description.length > 2000) return res.status(400).json({ error: '描述最多 2000 字' });

  const topic = {
    id: nextId(),
    title,
    direction,
    ownerId: req.user.id,
    status,
    description,
    deliverables: deliverables.slice(0, 2000),
    tags: splitTags(req.body?.tags),
    views: 0,
    createdAt: now()
  };
  db.omTopics.push(topic);
  commit();
  res.json({ topic: serializeOmTopic(topic, req.user) });
});

app.put('/api/om/topics/:id', auth, (req, res) => {
  const db = getDb();
  const topic = db.omTopics.find((t) => t.id === Number(req.params.id));
  if (!topic) return res.status(404).json({ error: '主题不存在' });
  const isOwner = topic.ownerId === req.user.id;
  const isManager = req.user.role === 'admin' || req.user.role === 'editor';
  if (!isOwner && !isManager) return res.status(403).json({ error: '只有主题发起人或管理员可以编辑' });

  const title = String(req.body?.title || '').trim();
  const direction = req.body?.direction;
  const description = String(req.body?.description || '').trim();
  const deliverables = String(req.body?.deliverables || '').trim();
  const status = req.body?.status;

  if (title && (title.length < 2 || title.length > 60)) return res.status(400).json({ error: '主题标题需为 2-60 个字符' });
  if (direction && !OM_DIRECTIONS.includes(direction)) return res.status(400).json({ error: '研究方向不合法' });
  if (description && description.length > 2000) return res.status(400).json({ error: '描述最多 2000 字' });
  if (status && !OM_STATUSES.includes(status)) return res.status(400).json({ error: '状态不合法' });

  if (title) topic.title = title;
  if (direction) topic.direction = direction;
  if (description) topic.description = description;
  if (deliverables !== undefined) topic.deliverables = deliverables.slice(0, 2000);
  if (status) topic.status = status;
  if (req.body?.tags !== undefined) topic.tags = splitTags(req.body.tags);
  commit();
  res.json({ topic: serializeOmTopic(topic, req.user) });
});

app.delete('/api/om/topics/:id', auth, (req, res) => {
  const db = getDb();
  const topic = db.omTopics.find((t) => t.id === Number(req.params.id));
  if (!topic) return res.status(404).json({ error: '主题不存在' });
  if (topic.ownerId !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: '只有主题发起人或管理员可以删除' });
  }
  db.omTopics = db.omTopics.filter((t) => t.id !== topic.id);
  db.intents = db.intents.filter((i) => i.topicId !== topic.id);
  db.participations = db.participations.filter((p) => p.topicId !== topic.id);
  db.claims = db.claims.filter((c) => c.topicId !== topic.id);
  db.sponsors = db.sponsors.filter((s) => s.topicId !== topic.id);
  db.omScores = db.omScores.filter((s) => s.topicId !== topic.id);
  commit();
  res.json({ ok: true });
});

app.post('/api/om/topics/:id/follow', auth, (req, res) => {
  const db = getDb();
  const topic = db.omTopics.find((t) => t.id === Number(req.params.id));
  if (!topic) return res.status(404).json({ error: '主题不存在' });
  const idx = db.intents.findIndex((i) => i.topicId === topic.id && i.userId === req.user.id);
  if (idx >= 0) db.intents.splice(idx, 1);
  else db.intents.push({ id: nextId(), topicId: topic.id, userId: req.user.id, type: 'follow', createdAt: now() });
  commit();
  res.json({ stats: omTopicStats(topic.id), my: myOmState(req.user, topic.id), myPoints: omPoints(req.user.id) });
});

app.post('/api/om/topics/:id/score', auth, (req, res) => {
  const db = getDb();
  const topic = db.omTopics.find((t) => t.id === Number(req.params.id));
  if (!topic) return res.status(404).json({ error: '主题不存在' });
  const score = Number(req.body?.score);
  if (!Number.isFinite(score) || score < 1 || score > 10) return res.status(400).json({ error: '评分需为 1-10 分' });

  const existing = db.omScores.find((s) => s.topicId === topic.id && s.userId === req.user.id);
  if (existing) existing.score = score;
  else db.omScores.push({ id: nextId(), topicId: topic.id, userId: req.user.id, score, createdAt: now() });
  commit();
  res.json({ stats: omTopicStats(topic.id), my: myOmState(req.user, topic.id), myPoints: omPoints(req.user.id) });
});

function omUpsertRecord(kind, topicId, user, fields) {
  const db = getDb();
  const list = omCollection(kind);
  const existing = list.find((r) => r.topicId === topicId && r.userId === user.id);
  if (existing && existing.status === 'approved') {
    return { error: '你已加入该主题，如需调整请联系发起人' };
  }
  if (existing) {
    Object.assign(existing, fields, { status: 'pending' });
    commit();
    return { record: existing };
  }
  const record = { id: nextId(), topicId, userId: user.id, status: 'pending', ...fields, createdAt: now() };
  list.push(record);
  commit();
  return { record };
}

app.post('/api/om/topics/:id/participate', auth, (req, res) => {
  const db = getDb();
  const topic = db.omTopics.find((t) => t.id === Number(req.params.id));
  if (!topic) return res.status(404).json({ error: '主题不存在' });
  const role = req.body?.role;
  const authorshipIntent = req.body?.authorshipIntent;
  const hoursPerWeek = Math.min(Math.max(Number(req.body?.hoursPerWeek) || 0, 0), 60);
  const note = String(req.body?.note || '').trim().slice(0, 300);
  if (!OM_ROLES.includes(role)) return res.status(400).json({ error: '分工意向不合法' });
  if (!OM_AUTHORSHIP.some((a) => a.key === authorshipIntent)) return res.status(400).json({ error: '排名意向不合法' });

  const r = omUpsertRecord('participation', topic.id, req.user, { role, hoursPerWeek, authorshipIntent, note });
  if (r.error) return res.status(400).json({ error: r.error });
  res.json({ participation: serializeOmRecord(r.record), stats: omTopicStats(topic.id), my: myOmState(req.user, topic.id), myPoints: omPoints(req.user.id) });
});

app.post('/api/om/topics/:id/claim', auth, (req, res) => {
  const db = getDb();
  const topic = db.omTopics.find((t) => t.id === Number(req.params.id));
  if (!topic) return res.status(404).json({ error: '主题不存在' });
  const claimType = req.body?.claimType;
  const note = String(req.body?.note || '').trim().slice(0, 300);
  if (!OM_CLAIM_TYPES.some((c) => c.key === claimType)) return res.status(400).json({ error: '认领类型不合法' });

  const r = omUpsertRecord('claim', topic.id, req.user, { claimType, note });
  if (r.error) return res.status(400).json({ error: r.error });
  res.json({ claim: serializeOmRecord(r.record), stats: omTopicStats(topic.id), my: myOmState(req.user, topic.id), myPoints: omPoints(req.user.id) });
});

app.post('/api/om/topics/:id/sponsor', auth, (req, res) => {
  const db = getDb();
  const topic = db.omTopics.find((t) => t.id === Number(req.params.id));
  if (!topic) return res.status(404).json({ error: '主题不存在' });
  const sponsorType = req.body?.sponsorType;
  const note = String(req.body?.note || '').trim().slice(0, 300);
  if (!OM_SPONSOR_TYPES.some((s) => s.key === sponsorType)) return res.status(400).json({ error: '资助类型不合法' });

  const r = omUpsertRecord('sponsor', topic.id, req.user, { sponsorType, note });
  if (r.error) return res.status(400).json({ error: r.error });
  res.json({ sponsor: serializeOmRecord(r.record), stats: omTopicStats(topic.id), my: myOmState(req.user, topic.id), myPoints: omPoints(req.user.id) });
});

app.post('/api/om/topics/:id/withdraw', auth, (req, res) => {
  const db = getDb();
  const topic = db.omTopics.find((t) => t.id === Number(req.params.id));
  if (!topic) return res.status(404).json({ error: '主题不存在' });
  const kind = req.body?.kind;
  const list = omCollection(kind);
  if (!list.length) return res.status(400).json({ error: '申请类型不合法' });
  const record = list.find((r) => r.topicId === topic.id && r.userId === req.user.id);
  if (!record) return res.status(400).json({ error: '没有找到你的申请' });
  if (record.status === 'approved') return res.status(400).json({ error: '申请已通过，不能撤回，请联系发起人' });
  if (kind === 'participation') db.participations = db.participations.filter((r) => r.id !== record.id);
  if (kind === 'claim') db.claims = db.claims.filter((r) => r.id !== record.id);
  if (kind === 'sponsor') db.sponsors = db.sponsors.filter((r) => r.id !== record.id);
  commit();
  res.json({ stats: omTopicStats(topic.id), my: myOmState(req.user, topic.id), myPoints: omPoints(req.user.id) });
});

app.post('/api/om/topics/:id/review', auth, (req, res) => {
  const db = getDb();
  const topic = db.omTopics.find((t) => t.id === Number(req.params.id));
  if (!topic) return res.status(404).json({ error: '主题不存在' });
  if (topic.ownerId !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: '只有主题发起人或管理员可以审核' });
  }
  const kind = req.body?.kind;
  const list = omCollection(kind);
  const record = list.find((r) => r.id === Number(req.body?.recordId) && r.topicId === topic.id);
  if (!record) return res.status(404).json({ error: '申请记录不存在' });
  if (record.status !== 'pending') return res.status(400).json({ error: '该申请已处理过' });
  record.status = req.body?.approved ? 'approved' : 'rejected';
  commit();
  res.json({ stats: omTopicStats(topic.id), myPoints: omPoints(req.user.id) });
});

// ---------- 眼科AI 日报 ----------
app.get('/api/oph/journals', (req, res) => {
  res.json({
    groups: OPH_JOURNAL_GROUPS.map((g) => ({
      name: g.name,
      journals: g.journals.map((j) => ({ label: j.label, ta: j.ta, ifRef: j.ifRef ?? null }))
    })),
    total: OPH_JOURNALS.length,
    note: '影响因子为参考值（≈），以期刊官方/JCR 为准'
  });
});

app.get('/api/oph/reports', (req, res) => {
  const out = [];
  if (fs.existsSync(REPORTS_DIR)) {
    for (const d of fs.readdirSync(REPORTS_DIR).sort().reverse()) {
      const dPath = path.join(REPORTS_DIR, d);
      if (!fs.statSync(dPath).isDirectory()) continue;
      const files = fs
        .readdirSync(dPath)
        .filter((f) => f.endsWith('.docx'))
        .map((f) => ({
          name: f,
          size: fs.statSync(path.join(dPath, f)).size,
          path: `${d}/${f}`
        }));
      if (files.length) out.push({ date: d, files });
    }
  }
  res.json({ items: out });
});

app.get('/api/oph/reports/download', (req, res) => {
  const p = String(req.query.path || '');
  if (!/^\d{4}-\d{2}-\d{2}\/[\u4e00-\u9fa5A-Za-z0-9._-]+\.docx$/.test(p)) {
    return res.status(400).json({ error: '文件路径不合法' });
  }
  const resolved = path.resolve(REPORTS_DIR, p);
  if (!resolved.startsWith(path.resolve(REPORTS_DIR)) || !fs.existsSync(resolved)) {
    return res.status(404).json({ error: '文件不存在' });
  }
  res.download(resolved, path.basename(resolved));
});

// ---------- 自动更新 ----------
app.get('/api/admin/sync', auth, requireRole('admin'), (req, res) => {
  const db = getDb();
  res.json({ meta: db.meta || {} });
});

const syncLimit = rateLimit({
  windowMs: 3600000,
  max: 6,
  message: '手动同步过于频繁，请稍后再试'
});

app.post('/api/admin/sync', auth, requireRole('admin'), syncLimit, (req, res) => {
  const db = getDb();
  if (db.meta?.syncing) return res.status(409).json({ error: '同步正在进行中，请稍后再试' });
  runAutoUpdate().catch((e) => console.error('[lifesci-hub][自动更新] 手动触发失败：', e));
  res.json({ started: true });
});

// ---------- 翻译通道（百度优先 / MyMemory 兜底） ----------
app.get('/api/admin/translate/status', auth, requireRole('admin'), async (req, res) => {
  const status = translationStatus();
  if (req.query.probe === '1') {
    try {
      status.doctor = await baiduDoctor(); // 现场执行 trans doctor
      Object.assign(status, translationStatus()); // doctor 可能解除/设置封锁
    } catch (e) {
      status.doctor = { allOk: false, reason: String(e?.message || e), checks: [] };
    }
  }
  const db = getDb();
  const pending = db.articles.filter(
    (a) => !a.titleCn && !/[\u4e00-\u9fa5]/.test(String(a.title || ''))
  ).length;
  const translated = db.articles.filter((a) => !!a.titleCn).length;
  res.json({ ...status, titles: { total: db.articles.length, translated, pending } });
});

const backfillLimit = rateLimit({
  windowMs: 3600000,
  max: 10,
  message: '补翻触发过于频繁，请稍后再试'
});

app.post('/api/admin/translate/backfill', auth, requireRole('admin'), backfillLimit, async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 1000);
  const force = req.query.force === '1';   // 重译已有中文标题（旧译文存入 titleCnPrev）
  const ophOnly = req.query.scope === 'oph'; // 仅眼科AI文章
  try {
    const report = await backfillTitles(limit, { force, ophOnly });
    res.json({ started: true, report });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// 手动重新生成今日眼科AI日报（docx）
app.post('/api/admin/oph/report', auth, requireRole('admin'), syncLimit, async (req, res) => {
  try {
    const report = await runOphDaily({ force: true });
    res.json({ started: true, report });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// 中文摘要重译（百度的专业术语更准；英文摘要原文保持不变）
app.post('/api/admin/translate/abstracts', auth, requireRole('admin'), backfillLimit, async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
  const budget = Math.min(Math.max(Number(req.query.budget) || 60000, 1000), 500000);
  const primaryOnly = req.query.scope === 'primary'; // 仅目标期刊文章（成本最低、价值最高）
  const force = req.query.force === '1';             // 连已重译过的也再译一遍
  try {
    const report = await retranslateAbstracts(limit, { charBudget: budget, primaryOnly, force });
    res.json({ started: true, report });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// ---------- 静态资源与 SPA 回退 ----------
const dist = path.join(__dirname, '..', 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(dist, 'index.html'));
    }
    next();
  });
}

app.use('/api', (req, res) => res.status(404).json({ error: '接口不存在' }));

app.use((err, req, res, next) => {
  console.error('[lifesci-hub] 服务器错误：', err);
  res.status(500).json({ error: '服务器内部错误' });
});

app.listen(PORT, () => {
  console.log(`[lifesci-hub] 服务已启动: http://localhost:${PORT}`);
});

// ---------- 自动更新调度 ----------
// 服务启动后延迟首次同步，此后按 UPDATE_INTERVAL_HOURS（默认 12 小时）自动执行；
// 也可通过 `npm run update` 或管理后台「立即同步」手动触发。
const UPDATE_INTERVAL_HOURS = Number(process.env.UPDATE_INTERVAL_HOURS) || 12;
const UPDATE_FIRST_DELAY_MS = Number(process.env.UPDATE_FIRST_DELAY_MS) || 8000;

function scheduleAutoUpdate() {
  setTimeout(() => {
    runAutoUpdate().catch((e) => console.error('[lifesci-hub][自动更新] 首次同步失败：', e));
  }, UPDATE_FIRST_DELAY_MS);
  setInterval(() => {
    runAutoUpdate().catch((e) => console.error('[lifesci-hub][自动更新] 定时同步失败：', e));
  }, UPDATE_INTERVAL_HOURS * 3600 * 1000);
  // 每日清理过期会话
  setInterval(() => {
    try {
      pruneSessions();
    } catch (e) {
      console.error('[lifesci-hub] 清理过期会话失败：', e);
    }
  }, 24 * 3600 * 1000);
  console.log(
    `[lifesci-hub] 自动更新已开启：每 ${UPDATE_INTERVAL_HOURS} 小时同步顶刊文献与学校竞赛通知`
  );
  console.log(
    `[lifesci-hub] 安全设置：${PUBLIC_MODE ? '公开模式（首个注册用户为管理员）' : '开发模式（含演示账号）'} · 会话有效期 ${Number(process.env.SESSION_TTL_DAYS) || 7} 天`
  );
}
scheduleAutoUpdate();

// ---------- 眼科AI 日报调度：每日 8:00 自动收集并生成 docx ----------
const OPH_DAILY_HOUR = Number(process.env.OPH_DAILY_HOUR) || 8;
function scheduleOphDaily() {
  const run = () => runOphDaily().catch((e) => console.error('[lifesci-hub][眼科AI日报] 失败：', e));
  // 启动后立即执行一次（保证今天有数据），此后每天 8:00
  setTimeout(run, Number(process.env.OPH_FIRST_DELAY_MS) || 6000);

  const nowT = new Date();
  const next = new Date(nowT);
  next.setHours(OPH_DAILY_HOUR, 0, 0, 0);
  if (next <= nowT) next.setDate(next.getDate() + 1);
  setTimeout(() => {
    run();
    setInterval(run, 24 * 3600 * 1000);
  }, Math.max(next - nowT, 1000));
  console.log(
    `[lifesci-hub] 眼科AI日报已启用：每天早上 ${OPH_DAILY_HOUR}:00 自动检索「${'眼科 + AI'}」论文并生成公众号/网站 docx`
  );
}
scheduleOphDaily();
