#!/bin/bash
# ============================================================================
# 配置「永久访问链接」——Cloudflare 命名隧道 + 开机自启
#
# 用法：
#   bash setup-permanent-link.sh <你的域名> [子域名]
# 例：
#   bash setup-permanent-link.sh example.com              # → https://lifesci.example.com
#   bash setup-permanent-link.sh example.com lifesci      # 同上
#   bash setup-permanent-link.sh example.com oph-ai       # → https://oph-ai.example.com
#
# 前置条件（只需做一次，约 10 分钟）：
#   1) 有一个域名（阿里云/腾讯云/Namesilo 等购买，.top/.xyz 首年约 ¥10-40）
#   2) 该域名已添加到 Cloudflare（免费套餐即可）：
#      Cloudflare 控制台 → Add a site → 输入域名 → 选 Free → 到域名商把 NS 改成
#      Cloudflare 给的两个名称服务器 → 等待生效（几分钟 ~ 几小时）
#   3) 本机已安装 cloudflared（已在 /Users/apple/bin/cloudflared）
#
# 本脚本会依次完成：
#   ① 引导登录 Cloudflare（会打开浏览器点一次授权）
#   ② 创建命名隧道 lifesci-hub
#   ③ 绑定 https://<子域名>.<域名> → 本机 3000 端口
#   ④ 把网站服务和隧道都装成开机自启（launchd），断网重连后自动恢复
#   ⑤ 验证访问
#
# 重要说明：网站跑在这台 Mac 上，所以电脑关机/睡眠/断网时，链接打不开。
#           若要 7×24 小时在线，需要把项目部署到服务器（见 README 说明）。
# ============================================================================
set -euo pipefail

DOMAIN="${1:-}"
SUB="${2:-lifesci}"
TUNNEL_NAME="lifesci-hub"
CF="/Users/apple/bin/cloudflared"
HOME_DIR="/Users/apple"
PROJECT="$HOME_DIR/lifesci-hub"
CF_DIR="$HOME_DIR/.cloudflared"
PLIST_DIR="$HOME_DIR/Library/LaunchAgents"
HOSTNAME_FULL="${SUB}.${DOMAIN}"

if [ -z "$DOMAIN" ]; then
  echo "用法: bash setup-permanent-link.sh <你的域名> [子域名]"
  echo "例如: bash setup-permanent-link.sh example.com lifesci"
  exit 1
fi

if [ ! -x "$CF" ]; then
  echo "❌ 找不到 cloudflared：$CF"
  echo "   安装：brew install cloudflared"
  exit 1
fi

echo "=============================================="
echo " 目标永久链接: https://${HOSTNAME_FULL}"
echo " 本地服务端口: http://localhost:3000"
echo "=============================================="

# ---------- 0) 本地服务是否在跑 ----------
echo
echo "[0/5] 检查本地网站服务..."
if ! curl -s -o /dev/null --max-time 5 http://localhost:3000/; then
  echo "  网站未运行，尝试启动..."
  (cd "$PROJECT" && nohup node server/index.js > server.log 2>&1 & disown)
  sleep 6
fi
if curl -s -o /dev/null --max-time 5 http://localhost:3000/; then
  echo "  ✅ 网站服务正常"
else
  echo "  ❌ 网站启动失败，请先确认 npm start 能正常运行"
  exit 1
fi

# ---------- 1) 登录 Cloudflare ----------
echo
echo "[1/5] 检查 Cloudflare 登录状态..."
mkdir -p "$CF_DIR"
if [ -f "$CF_DIR/cert.pem" ]; then
  echo "  ✅ 已登录（$CF_DIR/cert.pem 存在）"
else
  echo "  需要登录：即将打开浏览器，请在页面上选择你的域名并点击授权。"
  echo "  （如果没自动打开，请手动访问命令输出的网址）"
  "$CF" tunnel login
  if [ ! -f "$CF_DIR/cert.pem" ]; then
    echo "  ❌ 登录未完成，请重试"
    exit 1
  fi
  echo "  ✅ 登录成功"
fi

# ---------- 2) 创建（或复用）命名隧道 ----------
echo
echo "[2/5] 创建命名隧道 ${TUNNEL_NAME} ..."
TUNNEL_ID=$("$CF" tunnel list 2>/dev/null | awk -v n="$TUNNEL_NAME" '$2==n {print $1}' | head -1 || true)
if [ -n "$TUNNEL_ID" ]; then
  echo "  ✅ 已存在，隧道 ID：${TUNNEL_ID}"
else
  "$CF" tunnel create "$TUNNEL_NAME"
  TUNNEL_ID=$("$CF" tunnel list 2>/dev/null | awk -v n="$TUNNEL_NAME" '$2==n {print $1}' | head -1)
  echo "  ✅ 创建成功，隧道 ID：${TUNNEL_ID}"
fi

CRED_FILE="$CF_DIR/${TUNNEL_ID}.json"
if [ ! -f "$CRED_FILE" ]; then
  echo "  ❌ 找不到凭据文件：$CRED_FILE"
  exit 1
fi

# ---------- 3) 写配置并绑定域名 ----------
echo
echo "[3/5] 写入配置并绑定域名..."
cat > "$CF_DIR/config.yml" <<YAML
# LifeSciHub 永久隧道配置（由 setup-permanent-link.sh 生成）
tunnel: ${TUNNEL_ID}
credentials-file: ${CRED_FILE}
# 本机无 IPv6 路由：强制 IPv4，避免 "no route to host" 导致的反复断连
edge-ip-version: "4"
protocol: http2

ingress:
  - hostname: ${HOSTNAME_FULL}
    service: http://localhost:3000
    originRequest:
      connectTimeout: 30s
      noTLSVerify: false
  - service: http_status:404
YAML
echo "  ✅ 已写入 $CF_DIR/config.yml"

"$CF" tunnel route dns "$TUNNEL_NAME" "$HOSTNAME_FULL" || echo "  ⚠️ DNS 记录可能已存在（可忽略）"

# ---------- 4) 安装开机自启 ----------
echo
echo "[4/5] 配置开机自启（launchd）..."
mkdir -p "$PLIST_DIR"

# 4a) 网站服务
cat > "$PLIST_DIR/com.lifescihub.server.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.lifescihub.server</string>
  <key>ProgramArguments</key>
  <array>
    <string>$(command -v node)</string>
    <string>${PROJECT}/server/index.js</string>
  </array>
  <key>WorkingDirectory</key><string>${PROJECT}</string>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>${PROJECT}/server.log</string>
  <key>StandardErrorPath</key><string>${PROJECT}/server.log</string>
</dict>
</plist>
PLIST

# 4b) 隧道
cat > "$PLIST_DIR/com.lifescihub.tunnel.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.lifescihub.tunnel</string>
  <key>ProgramArguments</key>
  <array>
    <string>${CF}</string>
    <string>tunnel</string>
    <string>--config</string>
    <string>${CF_DIR}/config.yml</string>
    <string>run</string>
    <string>${TUNNEL_ID}</string>
  </array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>${HOME_DIR}/cloudflared.log</string>
  <key>StandardErrorPath</key><string>${HOME_DIR}/cloudflared.log</string>
</dict>
</plist>
PLIST

for label in com.lifescihub.server com.lifescihub.tunnel; do
  launchctl unload "$PLIST_DIR/${label}.plist" 2>/dev/null || true
  launchctl load "$PLIST_DIR/${label}.plist"
  echo "  ✅ 已加载 ${label}"
done

# ---------- 5) 验证 ----------
echo
echo "[5/5] 等待隧道连接（约 15 秒）..."
sleep 15
CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 25 "https://${HOSTNAME_FULL}" || echo "000")
if [ "$CODE" = "200" ]; then
  echo
  echo "🎉 配置完成！永久链接："
  echo "   https://${HOSTNAME_FULL}"
  echo
  echo "该链接不会再变化；电脑重启后网站与隧道会自动启动。"
else
  echo
  echo "⚠️ 暂时返回 $CODE。可能原因："
  echo "   · DNS 还没生效（新加的域名通常要等几分钟到几小时）"
  echo "   · 域名 NS 还没切换到 Cloudflare（用 dig NS ${DOMAIN} 检查）"
  echo "   · 隧道刚启动，稍等 1 分钟再试：curl -I https://${HOSTNAME_FULL}"
  echo "   查看隧道日志：tail -30 ${HOME_DIR}/cloudflared.log"
fi
