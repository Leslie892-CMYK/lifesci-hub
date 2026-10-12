#!/bin/bash
# 一键启动 / 恢复公网访问链接（临时演示用）
# 用法：  bash start-link.sh
# 作用：  1) 本地服务没运行就自动启动
#         2) 已有隧道还能用就直接复用（链接不变）
#         3) 隧道掉了就自动新建，并把新链接写入 CURRENT_URL.txt 与桌面快捷方式
# 注意：  电脑需保持开机、联网、不睡眠；快速隧道的地址在重建后会变化。
set -u
cd "$(dirname "$0")"
URL_FILE="/Users/apple/CURRENT_URL.txt"
LOG="/Users/apple/cloudflared.log"
CF="/Users/apple/bin/cloudflared"
SHORTCUT="/Users/apple/Desktop/生命科学前沿网站.webloc"
URLTXT="/Users/apple/Desktop/网站链接(可复制).txt"

# 在桌面生成双击即可打开的快捷方式（macOS .webloc）+ 纯文本链接（方便复制发微信）
write_shortcut() {
  cat > "$SHORTCUT" <<WEBLOC
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>URL</key>
  <string>$1</string>
</dict>
</plist>
WEBLOC
  printf '%s\n' "$1" > "$URLTXT"
}

echo "→ 检查本地服务 (http://localhost:3000)..."
if ! curl -s -o /dev/null --max-time 5 http://localhost:3000/; then
  echo "  本地服务未运行，正在启动..."
  nohup node server/index.js > server.log 2>&1 & disown
  sleep 6
  if ! curl -s -o /dev/null --max-time 5 http://localhost:3000/; then
    echo "❌ 本地服务启动失败，请查看 server.log"
    exit 1
  fi
fi
echo "  ✅ 本地服务正常"

if [ -f "$URL_FILE" ]; then
  OLD=$(tr -d '\n' < "$URL_FILE")
  # 必须判断 HTTP 200：隧道断开时 Cloudflare 会返回 530 错误页，curl 仍算"成功"
  if [ -n "$OLD" ] && [ "$(curl -s -o /dev/null -w '%{http_code}' --max-time 12 "$OLD")" = "200" ]; then
    echo "✅ 现有公网链接仍然可用（链接未变）："
    echo "   $OLD"
    write_shortcut "$OLD"
    exit 0
  fi
  echo "→ 旧链接已失效，正在创建新链接..."
else
  echo "→ 首次创建公网链接..."
fi

if [ ! -x "$CF" ]; then
  echo "❌ 找不到 cloudflared：$CF"
  echo "   安装方式：brew install cloudflared"
  exit 1
fi

# 先清掉残留的旧隧道进程，避免同时跑多个隧道互相干扰
pkill -f "cloudflared tunnel --url" 2>/dev/null && { echo "  （已结束残留隧道进程）"; sleep 2; }

: > "$LOG"
# --edge-ip-version 4：本机没有 IPv6 路由，若走 IPv6 会报 "no route to host" 导致隧道反复断连
nohup "$CF" tunnel --url http://localhost:3000 --protocol http2 --edge-ip-version 4 --no-autoupdate > "$LOG" 2>&1 & disown

NEW=""
for _ in $(seq 1 40); do
  sleep 1
  NEW=$(grep -o 'https://[a-zA-Z0-9-]*\.trycloudflare\.com' "$LOG" 2>/dev/null | head -1)
  [ -n "$NEW" ] && break
done

if [ -z "$NEW" ]; then
  echo "❌ 创建失败，日志见 $LOG"
  exit 1
fi

echo "$NEW" > "$URL_FILE"
write_shortcut "$NEW"

# 新域名刚生成时本机 DNS 缓存可能还没更新，多试几次再判定
CODE="000"
for _ in $(seq 1 10); do
  sleep 5
  CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$NEW")
  [ "$CODE" = "200" ] && break
done

if [ "$CODE" = "200" ]; then
  echo "✅ 新公网链接（已保存到 ${URL_FILE}，桌面也生成了快捷方式）："
  echo "   $NEW"
else
  echo "⚠️ 链接已生成但访问返回 ${CODE}（新域名 DNS 生效可能要 1-2 分钟，稍后再刷新试试）："
  echo "   $NEW"
  echo "   若持续 530/000，说明隧道连不上 Cloudflare 边缘（通常是代理/网络问题），"
  echo "   可关闭代理后重跑本脚本，或查看 $LOG"
fi
