// 一键生成分发包：npm run package
// 输出：/Users/apple/lifesci-hub-源代码包.zip
// 排除：node_modules / .git / data（含数据库）/ 日志 / .env（含 API Key 等私密配置，只保留 .env.example 模板）
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(path.dirname(root), 'lifesci-hub-源代码包.zip');

execSync(
  `cd "${root}" && rm -f "${out}" && zip -r "${out}" . -x "node_modules/*" ".git/*" "data/*" "server.log" ".DS_Store" ".env" "*/node_modules/*" "*/.env"`,
  { stdio: 'inherit' }
);
console.log(`\n✅ 分发包已生成：${out}`);
