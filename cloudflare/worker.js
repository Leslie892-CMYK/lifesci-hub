import { DurableObject } from 'cloudflare:workers';
import { createServer } from 'node:http';
import { httpServerHandler } from 'cloudflare:node';
import { Buffer } from 'node:buffer';
import { attachStorage, existsSync, writeFileSync, readFileSync } from './storage.js';
import bootstrap from './generated/bootstrap.json';

// This namespace has exactly one application object: the original JSON data layer
// remains a single writer while its files are persisted transactionally in SQLite.
export class LifeSciApp extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      attachStorage(ctx.storage);
      for (const [key, value] of Object.entries(env)) {
        if (typeof value === 'string') process.env[key] = value;
      }
      process.env.PUBLIC_MODE = '1';
      process.env.TRUST_PROXY = '1';
      if (!existsSync('/lifesci/data/db.json')) {
        for (const file of bootstrap.files) writeFileSync(file.path, Buffer.from(file.body, 'base64'));
      }
      this.backend = await import('./generated/app.js');
      this.backend.resetDb(JSON.parse(readFileSync('/lifesci/data/db.json', 'utf8')));
      this.backend.getDb().meta.syncing = false;
      this.backend.getDb().meta.ophSyncing = false;
      this.backend.commitNow();
      this.handler = httpServerHandler(createServer(this.backend.app));
    });
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/__tick') {
      const kind = url.searchParams.get('kind');
      await this.enqueue(kind);
      return Response.json({ started: true });
    }
    if (url.pathname === '/api/admin/sync' && request.method === 'POST') {
      const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
      const user = this.backend.getUserByToken(token);
      if (!user) return Response.json({ error: '请先登录' }, { status: 401 });
      if (user.role !== 'admin') return Response.json({ error: '没有权限执行该操作' }, { status: 403 });
      const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || '127.0.0.1';
      const rateKey = 'manualSync/' + ip;
      let rate = await this.ctx.storage.get(rateKey);
      if (!rate || Date.now() >= rate.resetAt) rate = { count: 0, resetAt: Date.now() + 3600000 };
      rate.count++;
      await this.ctx.storage.put(rateKey, rate);
      if (rate.count > 6) return Response.json({ error: '手动同步过于频繁，请稍后再试' }, { status: 429 });
      if (this.backend.getDb().meta.syncing || (await this.ctx.storage.get('pendingJobs') || []).length) return Response.json({ error: '同步正在进行中，请稍后再试' }, { status: 409 });
      await this.enqueue('update');
      return Response.json({ started: true }, { headers: { 'Cache-Control': 'no-store' } });
    }
    if (url.pathname === '/api/health') {
      const db = this.backend.getDb();
      return Response.json({ ok: true, storage: 'durable-sqlite', articles: db.articles.length, journals: 19, timezone: 'Asia/Shanghai' });
    }
    if (url.pathname === '/api/admin/backup/export') {
      const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
      if (this.backend.getUserByToken(token)?.role !== 'admin') return Response.json({ error: '需要管理员权限' }, { status: 403 });
      this.backend.commitNow();
      return new Response(readFileSync('/lifesci/data/db.json'), { headers: { 'Content-Type': 'application/json', 'Content-Disposition': 'attachment; filename="lifesci-backup.json"', 'Cache-Control': 'no-store' } });
    }
    const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || '127.0.0.1';
    const headers = new Headers(request.headers);
    headers.set('X-Forwarded-For', ip);
    const response = await this.handler.fetch(new Request(request, { headers }), this.env, this.ctx);
    this.backend.commitNow();
    return response;
  }

  async enqueue(kind) {
    const pending = await this.ctx.storage.get('pendingJobs') || [];
    if (!pending.some((job) => job.kind === kind)) {
      pending.push({ id: crypto.randomUUID(), kind });
      await this.ctx.storage.put('pendingJobs', pending);
    }
    if (!await this.ctx.storage.getAlarm()) await this.ctx.storage.setAlarm(Date.now() + 1000);
  }

  async alarm() {
    const pending = await this.ctx.storage.get('pendingJobs') || [];
    if (!pending.length) return;
    const current = pending[0];
    await this.runJobs(current.kind);
    const remaining = (await this.ctx.storage.get('pendingJobs') || []).filter((job) => job.id !== current.id);
    await this.ctx.storage.put('pendingJobs', remaining);
    if (remaining.length) await this.ctx.storage.setAlarm(Date.now() + 1000);
  }

  async runJobs(kind) {
    try {
      this.backend.pruneSessions();
      if (kind === 'daily') await this.backend.runOphDaily();
      await this.backend.runAutoUpdate();
    } finally { this.backend.commitNow(); }
  }
}

export default {
  fetch(request, env) {
    return env.LIFESCI_APP.get(env.LIFESCI_APP.idFromName('main')).fetch(request);
  },
  async scheduled(event, env, ctx) {
    const daily = new Date(event.scheduledTime).getUTCHours() === 0;
    const stub = env.LIFESCI_APP.get(env.LIFESCI_APP.idFromName('main'));
    ctx.waitUntil(stub.fetch(`https://internal/__tick?kind=${daily ? 'daily' : 'update'}`, { method: 'POST' }));
  }
};
