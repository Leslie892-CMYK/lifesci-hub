#!/bin/bash
# ============================================================================
# 临时公网链接守护进程
#   每 60 秒检查一次「本地网站服务 + Cloudflare 隧道」：
#     · 网站服务挂了 → 自动拉起
#     · 隧道进程没了 → 自动重建，并更新 CURRENT_URL.txt 与桌面快捷方式
#     · 隧道在但连续 8 分钟访问不通 → 重启隧道
#   日志：/Users/apple/tunnel-watch.log
#   停止：pkill -f tunnel-watch.sh
# ============================================================================
set -u
cd "$(dirname "$0")"
URL_FILE="/Users/apple/CURRENT_URL.txt"
WLOG="/Users/apple/tunnel-watch.log"

# 若已配置永久隧道（命名隧道），本守护进程自动退出，避免与正式隧道冲突
if [ -f "/Users/apple/.cloudflared/config.yml" ]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] 检测到永久隧道配置，守护进程退出（临时链接不再需要）" >> "$WLOG"
  exit 0
fi

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$WLOG"; }
log "==== 守护进程启动（PID $$）===="
FAIL=0

while true; do
  # 1) 本地服务
  if ! curl -s -o /dev/null --max-time 5 http://localhost:3000/; then
    log "本地服务无响应，尝试启动"
    nohup node server/index.js > server.log 2>&1 & disown
    sleep 10
    if curl -s -o /dev/null --max-time 5 http://localhost:3000/; then
      log "本地服务已恢复"
    else
      log "本地服务仍无法启动，请查看 server.log"
    fi
  fi

  # 2) 隧道进程
  if ! pgrep -f "cloudflared tunnel --url" >/dev/null 2>&1; then
    log "隧道进程不存在，开始重建"
    bash start-link.sh >> "$WLOG" 2>&1
    FAIL=0
    sleep 60
    continue
  fi

  # 3) 隧道在跑，检查外网是否通
  U=$(tr -d '\n' < "$URL_FILE" 2>/dev/null || echo "")
  if [ -z "$U" ]; then
    log "链接记录为空，重建"
    bash start-link.sh >> "$WLOG" 2>&1
    sleep 60
    continue
  fi
  CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$U" 2>/dev/null || echo 000)
  if [ "$CODE" = "200" ]; then
    [ "$FAIL" -gt 0 ] && log "链接恢复正常（200）"
    FAIL=0
  else
    FAIL=$((FAIL + 1))
    log "链接返回 $CODE（连续第 $FAIL 次）"
    if [ "$FAIL" -ge 4 ]; then
      log "连续 4 次不通（约 4 分钟），重启隧道（链接会变化）"
      pkill -f "cloudflared tunnel --url" 2>/dev/null
      sleep 3
      bash start-link.sh >> "$WLOG" 2>&1
      NEW=$(tr -d '\n' < "$URL_FILE" 2>/dev/null || echo "")
      log "隧道已重建，新链接：$NEW"
      FAIL=0
    fi
  fi

  sleep 60
done
