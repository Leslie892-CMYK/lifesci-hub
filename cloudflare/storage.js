import path from 'node:path';
import { Buffer } from 'node:buffer';

let storage;
const cache = new Map();
const normalize = (name) => path.posix.resolve(String(name));
const CHUNK_SIZE = 256 * 1024;
const CACHE_LIMIT = 8 * 1024 * 1024;
function remember(name, body) {
  cache.delete(name);
  if (body.length <= CACHE_LIMIT) cache.set(name, body);
  while ([...cache.values()].reduce((total, value) => total + value.length, 0) > CACHE_LIMIT) cache.delete(cache.keys().next().value);
}

export function attachStorage(next) {
  storage = next;
  cache.clear();
  storage.sql.exec('CREATE TABLE IF NOT EXISTS files (path TEXT PRIMARY KEY, directory INTEGER NOT NULL, size INTEGER NOT NULL, modified INTEGER NOT NULL)');
  storage.sql.exec('CREATE TABLE IF NOT EXISTS chunks (path TEXT NOT NULL, part INTEGER NOT NULL, body BLOB NOT NULL, PRIMARY KEY (path, part))');
}

function metadata(name) {
  return storage.sql.exec('SELECT * FROM files WHERE path = ?', normalize(name)).toArray()[0];
}

function missing(name) {
  return Object.assign(new Error(`ENOENT: ${name}`), { code: 'ENOENT', path: name });
}

export function existsSync(name) { return Boolean(metadata(name)); }
export function mkdirSync(name, opts = {}) {
  const target = normalize(name);
  if (opts.recursive && target !== '/') mkdirSync(path.posix.dirname(target), opts);
  storage.sql.exec('INSERT OR IGNORE INTO files VALUES (?, 1, 0, ?)', target, Date.now());
  return target;
}

export function readFileSync(name, encoding) {
  const target = normalize(name);
  if (!metadata(target)) throw missing(target);
  let result = cache.get(target);
  if (!result) {
    const rows = storage.sql.exec('SELECT body FROM chunks WHERE path = ? ORDER BY part', target).toArray();
    result = Buffer.concat(rows.map((row) => Buffer.from(row.body)));
  }
  remember(target, result);
  const codec = typeof encoding === 'string' ? encoding : encoding?.encoding;
  return codec ? result.toString(codec) : Buffer.from(result);
}

export function writeFileSync(name, value, encoding) {
  const target = normalize(name);
  const body = Buffer.isBuffer(value) ? Buffer.from(value) : Buffer.from(value, typeof encoding === 'string' ? encoding : encoding?.encoding);
  mkdirSync(path.posix.dirname(target), { recursive: true });
  storage.transactionSync(() => {
    storage.sql.exec('DELETE FROM chunks WHERE path = ?', target);
    storage.sql.exec('INSERT OR REPLACE INTO files VALUES (?, 0, ?, ?)', target, body.length, Date.now());
    for (let start = 0, part = 0; start < body.length; start += CHUNK_SIZE, part++) {
      storage.sql.exec('INSERT INTO chunks VALUES (?, ?, ?)', target, part, body.subarray(start, start + CHUNK_SIZE));
    }
  });
  remember(target, body);
}

export function unlinkSync(name) {
  const target = normalize(name);
  if (!metadata(target)) throw missing(target);
  storage.transactionSync(() => {
    storage.sql.exec('DELETE FROM chunks WHERE path = ?', target);
    storage.sql.exec('DELETE FROM files WHERE path = ?', target);
  });
  cache.delete(target);
}

export function renameSync(from, to) {
  const oldPath = normalize(from), newPath = normalize(to);
  if (!metadata(oldPath)) throw missing(oldPath);
  storage.transactionSync(() => {
    storage.sql.exec('DELETE FROM chunks WHERE path = ?', newPath);
    storage.sql.exec('DELETE FROM files WHERE path = ?', newPath);
    storage.sql.exec('UPDATE files SET path = ? WHERE path = ?', newPath, oldPath);
    storage.sql.exec('UPDATE chunks SET path = ? WHERE path = ?', newPath, oldPath);
  });
  if (cache.has(oldPath)) { const body = cache.get(oldPath); cache.delete(oldPath); remember(newPath, body); }
}

export function copyFileSync(from, to) { writeFileSync(to, readFileSync(from)); }
export function statSync(name) {
  const row = metadata(name);
  if (!row) throw missing(name);
  return { size: row.size, mtime: new Date(row.modified), isDirectory: () => Boolean(row.directory), isFile: () => !row.directory };
}
export function readdirSync(name) {
  const target = normalize(name);
  if (!metadata(target)) throw missing(target);
  const prefix = target === '/' ? '/' : target + '/';
  return storage.sql.exec('SELECT path FROM files WHERE substr(path, 1, ?) = ?', prefix.length, prefix).toArray()
    .map((row) => row.path.slice(prefix.length)).filter((rest) => rest && !rest.includes('/')).sort();
}
export default { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync, renameSync, copyFileSync, statSync, readdirSync };
