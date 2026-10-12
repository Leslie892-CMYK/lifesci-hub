# 公网部署手册（LifeSciHub）

本手册帮助你把站点公开上线。前置要求已内置：**公开模式**（无演示账号）、注册/登录限流、会话 7 天过期、数据自动备份、安全响应头。

## 方案 A：Docker 部署（推荐）

服务器需安装 Docker 与 Docker Compose：

```bash
git clone <你的仓库> lifesci-hub && cd lifesci-hub   # 或上传项目目录
cp .env.example .env                                  # 按需修改（PUBLIC_MODE 推荐保持 1）
docker compose up -d --build
# 访问 http://<服务器IP>:3000
```

- 数据与备份存在 `./data/`（已挂载卷），升级容器不会丢失
- 首次注册的账号自动成为**管理员**，请妥善保管并设置强密码

### 方案 A'：非 Docker（Node 直接运行）

```bash
# 服务器安装 Node.js 18+（推荐 20 LTS）
npm install
npm run build
PUBLIC_MODE=1 nohup node server/index.js > server.log 2>&1 &
```

开机自启可用 `systemd`：

```ini
# /etc/systemd/system/lifesci-hub.service
[Unit]
Description=LifeSciHub
After=network.target

[Service]
WorkingDirectory=/opt/lifesci-hub
ExecStart=/usr/bin/node server/index.js
Environment=PUBLIC_MODE=1
Environment=TRUST_PROXY=1
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now lifesci-hub
```

## 域名与 HTTPS（强烈建议）

**Caddy（自动 HTTPS，最简单）** —— `Caddyfile`：

```
lifesci.example.com {
    reverse_proxy 127.0.0.1:3000
}
```

**Nginx + certbot**：

```nginx
server {
    listen 443 ssl;
    server_name lifesci.example.com;
    ssl_certificate     /etc/letsencrypt/live/lifesci.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/lifesci.example.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Host $host;
    }
}
server { listen 80; server_name lifesci.example.com; return 301 https://$host$request_uri; }
```

> 使用反代时请设置 `TRUST_PROXY=1`，限流才能按真实访问者 IP 生效。

## 上线后立刻做的三件事

1. **注册首个账号** —— 自动成为管理员（公开模式下唯一获得管理员的方式）
2. **进入管理后台**（导航栏「管理后台」）→ 概览页确认自动更新状态正常
3. **设置强密码**（点击导航栏用户名 → 账号设置 → 修改密码）

## 日常运维

```bash
# 手动备份数据库（存于 data/backups/，自动保留最近 20 份）
npm run backup

# 手动执行一次自动更新（顶刊 + 学校官网比赛通知）
npm run update

# 查看日志
tail -f server.log

# 恢复备份
cp data/backups/db-<时间戳>.json data/db.json && docker compose restart

# 重置数据（谨慎）
rm data/db.json && docker compose restart
```

## 自动更新说明

- 服务每 `UPDATE_INTERVAL_HOURS`（默认 12h）自动同步：**PubMed 顶刊文献**（含真实 DOI）与**学校官网 cxcy.hmc.edu.cn 比赛通知**
- 同步前会自动备份数据库；建议确认服务器可访问 `eutils.ncbi.nlm.nih.gov` 与 `cxcy.hmc.edu.cn`
- 官网同步的比赛条目标记「官网同步」，目录等级默认「待认定」，请在管理后台核定

## 安全说明（当前已实现）

- ✅ 公开模式：无演示账号；首个注册用户为管理员
- ✅ 注册/登录/写操作限流（IP + 用户粒度，默认 10/20/120 每小时）
- ✅ 会话 7 天过期，启动与每日自动清理过期会话
- ✅ scrypt 加盐密码哈希、无明文存储
- ✅ 安全响应头（nosniff / DENY / Referrer-Policy）
- ✅ 用户名白名单校验，XSS 由 React 自动转义
- ⚠️ 无邮件验证/找回密码（当前通过管理员在后台重置角色、直接编辑 db.json 重置密码）
- ⚠️ 单进程 JSON 存储适合中小规模（数百用户）；大规模建议把 `server/db.js` 换成 SQLite/MySQL
