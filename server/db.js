import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DATA_FILE = path.join(__dirname, '..', 'data', 'db.json');

let db = null;

export function emptyDb() {
  return {
    seq: 1,
    users: [],
    sessions: [],
    articles: [],
    communities: [],
    posts: [],
    repoItems: [],
    competitions: [],
    omTopics: [],
    intents: [],
    participations: [],
    claims: [],
    sponsors: [],
    omScores: [],
    meta: {},
    comments: [],
    likes: [],
    memberships: []
  };
}

export function getDb() {
  if (!db) {
    if (fs.existsSync(DATA_FILE)) {
      try {
        db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      } catch (e) {
        console.error('[lifesci-hub] 数据文件损坏，使用空数据库：', e.message);
        db = emptyDb();
      }
    } else {
      db = emptyDb();
    }
  }
  return db;
}

export function resetDb(next) {
  db = next;
  commitNow();
}

export function nextId() {
  return getDb().seq++;
}

let writeTimer = null;

function writeFile() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2), 'utf8');
  fs.renameSync(tmp, DATA_FILE);
}

/** 防抖写入：短时间内的多次修改合并为一次磁盘写入 */
export function commit() {
  if (writeTimer) return;
  writeTimer = setTimeout(() => {
    writeTimer = null;
    writeFile();
  }, 150);
}

export function commitNow() {
  if (writeTimer) {
    clearTimeout(writeTimer);
    writeTimer = null;
  }
  writeFile();
}
