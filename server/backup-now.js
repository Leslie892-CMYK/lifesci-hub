// 手动备份数据库：node server/backup-now.js（npm run backup）
import { backupDb } from './backup.js';
import { getDb } from './db.js';

getDb();
const name = backupDb();
console.log(name ? `[lifesci-hub][backup] 已备份: data/backups/${name}` : '[lifesci-hub][backup] 数据库文件不存在');
process.exit(0);
