#!/bin/bash
# 生成 Cloudflare 交付包；只包含源码、清空会话的数据快照和日报。
set -euo pipefail
SRC="$(cd "$(dirname "$0")" && pwd)"
OUT="${1:-$SRC/outputs/lifesci-hub-Cloudflare-源代码包-$(date +%Y%m%d).zip}"
if [[ ! -f "$SRC/cloudflare/generated/bootstrap.json" ]]; then
  echo '请先执行 npm run build:cloudflare，再生成交付包。'
  exit 1
fi
python3 "$SRC/cloudflare/package.py" "$OUT"
