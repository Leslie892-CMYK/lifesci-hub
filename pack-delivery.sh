#!/bin/bash
# ============================================================================
# 生成「完整交付包」并放到桌面
#   用法： bash pack-delivery.sh
#   产物： ~/Desktop/lifesci-hub-源代码包-YYYYMMDD.zip
#   内容： 全部源码 + 数据快照（脱敏）+ 日报样例 + 交付文档 + 部署文档
#   排除： node_modules / .git / dist / .env（含密钥）/ data/backups / 日志
# ============================================================================
set -euo pipefail
SRC="/Users/apple/lifesci-hub"
DESK="/Users/apple/Desktop"
STAMP=$(date +%Y%m%d)
WORK=$(mktemp -d)
STAGE="$WORK/lifesci-hub"
OUT="$DESK/lifesci-hub-源代码包-${STAMP}.zip"

echo "→ 准备暂存目录..."
mkdir -p "$STAGE"

echo "→ 复制源码（排除 node_modules/.git/dist/.env/备份/日志）..."
rsync -a \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude 'dist' \
  --exclude 'data/backups' \
  --exclude 'server.log' \
  --exclude '.env' \
  --exclude '*.zip' \
  --exclude '.DS_Store' \
  "$SRC/" "$STAGE/"

echo "→ 数据快照脱敏（清空登录会话，避免泄露登录态）..."
node -e "
const fs=require('fs');
const p='$STAGE/data/db.json';
const db=JSON.parse(fs.readFileSync(p,'utf8'));
const before=(db.sessions||[]).length;
db.sessions=[];
fs.writeFileSync(p, JSON.stringify(db,null,2));
console.log('   已清空 sessions：'+before+' → 0；文章 '+db.articles.length+' 篇，用户 '+db.users.length+' 个');
"

echo "→ 写入交付说明..."
cat > "$STAGE/交付包说明-先读我.txt" <<'TXT'
生命科学前沿 LifeSciHub · 交付包说明
=====================================

一、这个包里有什么
  server/            后端源码（Node + Express，66 个接口）
  src/               前端源码（React 18 + Vite）
  data/db.json       数据快照（已脱敏：登录会话已清空）
  data/reports/      眼科AI日报 docx 样例（按日期存放）
  交付文档.md         ★完整交付文档（架构/配置/数据模型/需求对照/待办/接手约定）
  README.md           功能说明、演示账号、部署方式
  DEPLOY.md           部署运维（Docker / systemd / 域名 HTTPS）
  .env.example        环境变量模板（复制为 .env，填入 TRANS_API_KEY）

二、怎么跑起来（3 步）
  npm install
  cp .env.example .env      # 填写 PUBLIC_MODE 与 TRANS_API_KEY（百度翻译 Key）
  npm run build && npm start
  浏览器打开 http://localhost:3000
  演示账号：admin / admin123（管理员）、editor / editor123（编辑）

三、注意事项
  1. 包内不含 .env（里面有百度翻译 API Key，需要自己申请后填入）
     Key 申请：https://fanyi-api.baidu.com/ → 开发者中心 → 通用翻译 → 实名认证 → apiKey 页面
  2. 包内不含 node_modules 与 dist，需通过 npm install / npm run build 生成
  3. 眼睛AI日报默认每天 8:00 自动执行（时区跟随系统），生成到 data/reports/日期/
  4. 修改代码前请先看《交付文档.md》第 10 章「接手约定」，避免踩已知的坑

四、先看哪些文件
  想了解整体       → 交付文档.md 第 1-3 章
  想接手开发       → 交付文档.md 第 9-10 章（待办 + 接手约定）
  想做眼科AI模块   → 交付文档.md 第 7 章 + server/oph.js
  想调翻译         → 交付文档.md 第 5.2 章 + server/translate.js
TXT

echo "→ 打包压缩（用 Python 写入 UTF-8 文件名，避免解压乱码）..."
python3 - "$WORK" "$OUT" <<'PY'
import sys, os, zipfile
root, out = sys.argv[1], sys.argv[2]
base = os.path.join(root, 'lifesci-hub')
count = 0
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for dirpath, _dirs, files in os.walk(base):
        for fn in sorted(files):
            full = os.path.join(dirpath, fn)
            z.write(full, os.path.relpath(full, root))
            count += 1
print(f'   已压缩 {count} 个文件')
PY

echo "→ 校验..."
# 注意：unzip -l 对中文文件名编码不友好，改用 Python 校验（UTF-8 安全）
python3 - "$OUT" <<'PY'
import sys, zipfile, json
z = zipfile.ZipFile(sys.argv[1])
names = z.namelist()

# 1) 安全：包内不得出现 .env（含百度翻译密钥）
envs = [n for n in names if n.split('/')[-1] == '.env']
if envs:
    print('  ❌ 危险：包内出现 .env，已中止！', envs)
    sys.exit(1)

# 2) 完整性：必须含交付文档与关键文件
required = ['交付文档.md', '交付包说明-先读我.txt', 'README.md', 'server/oph.js',
            'server/translate.js', 'src/App.jsx', 'data/db.json', '.env.example']
missing = [r for r in required if not any(n.endswith(r) for n in names)]
if missing:
    print('  ❌ 缺少文件：', missing)
    sys.exit(1)

# 3) 数据快照确认已脱敏
db = json.loads(z.read([n for n in names if n.endswith('data/db.json')][0]).decode('utf-8'))
if db.get('sessions'):
    print('  ❌ 数据快照未脱敏（sessions 非空）')
    sys.exit(1)

print(f'  ✅ 校验通过：无 .env（密钥安全）、交付文档齐全、数据已脱敏（{len(db["articles"])} 篇文章）')
print(f'     文件总数：{len(names)}')
PY
SIZE=$(du -h "$OUT" | cut -f1)
FILES=$(python3 -c "import zipfile,sys;print(len(zipfile.ZipFile(sys.argv[1]).namelist()))" "$OUT")
echo
echo "🎉 交付包已生成："
echo "   路径：$OUT"
echo "   大小：$SIZE   文件数：$FILES"
rm -rf "$WORK"
