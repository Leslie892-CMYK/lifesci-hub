// 手动触发一次自动更新：node server/update-now.js（也可配合系统 cron / launchd 定时执行）
import fs from 'node:fs';
import { getDb, commitNow, DATA_FILE, resetDb } from './db.js';
import { buildSeed } from './seed.js';
import { runAutoUpdate } from './updater.js';

if (!fs.existsSync(DATA_FILE)) {
  console.log('[lifesci-hub][update-now] 未发现数据库，先写入演示种子数据…');
  resetDb(buildSeed());
}

const db = getDb();
// 清理上次异常退出可能残留的同步状态
if (db.meta?.syncing) {
  db.meta.syncing = false;
  commitNow();
  console.log('[lifesci-hub][update-now] 已清理上次残留的同步状态');
}

const report = await runAutoUpdate();
console.log('[lifesci-hub][update-now] 完成：', JSON.stringify(report, null, 2));
process.exit(0);
