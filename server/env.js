// 极简 .env 加载器（零依赖）
// 作用：让项目根目录的 .env 真正生效（此前只有 .env.example 模板，没有任何代码读取它）。
// 规则：已存在的环境变量优先（不覆盖），支持 # 注释、空行、KEY=VALUE、值两侧引号。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV_FILE = path.join(__dirname, '..', '.env');

export function loadEnv(file = ENV_FILE) {
  const loaded = [];
  try {
    if (!fs.existsSync(file)) return loaded;
    const text = fs.readFileSync(file, 'utf8');
    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq <= 0) continue;
      const key = line.slice(0, eq).trim();
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
      let value = line.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) {
        process.env[key] = value;
        loaded.push(key);
      }
    }
  } catch {
    // 读取失败不影响启动
  }
  return loaded;
}

export const ENV_FILE_PATH = ENV_FILE;

loadEnv();
