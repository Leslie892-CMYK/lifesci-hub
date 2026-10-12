// 数据库备份：自动同步前备份 + 手动 npm run backup
// 保留最近 BACKUP_KEEP（默认 20）份
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DATA_FILE } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const BACKUP_DIR = path.join(__dirname, '..', 'data', 'backups');
const BACKUP_KEEP = Number(process.env.BACKUP_KEEP) || 20;

function timestamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

export function backupDb() {
  if (!fs.existsSync(DATA_FILE)) return null;
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const name = `db-${timestamp()}.json`;
  fs.copyFileSync(DATA_FILE, path.join(BACKUP_DIR, name));

  // 只保留最近 N 份
  const files = fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => /^db-\d{8}-\d{6}\.json$/.test(f))
    .sort();
  while (files.length > BACKUP_KEEP) {
    const oldest = files.shift();
    try {
      fs.unlinkSync(path.join(BACKUP_DIR, oldest));
    } catch {
      // 忽略删除失败
    }
  }
  return name;
}
