# 生命科学前沿 · LifeSciHub

React + Express 学术社区项目，提供生命科学资讯、科研社区、招募组队、竞赛通知和科研工具仓库。眼科 AI 日报覆盖指定 19 本期刊，保留英文原题并提供中文翻译及 Word 日报。

**在线网站：[lifesci-hub.pages.dev](https://lifesci-hub.pages.dev/)**

本仓库公开源码与演示种子，生产数据库、登录会话、账号密码、日报存档和 API 密钥不纳入 Git。当前线上站的 592 篇论文仍保存在 Cloudflare，原始完整交付包也已另行备份。

## 本地运行

需要 Node.js 22.13+ 和 npm：

```bash
git clone https://github.com/Leslie892-CMYK/lifesci-hub.git
cd lifesci-hub
npm ci
cp .env.example .env
npm run build
npm start
```

打开 [http://localhost:3000](http://localhost:3000)。默认 `PUBLIC_MODE=1`，首次启动创建内容种子，不创建演示账号；**第一个注册账号成为管理员**。仅在本地演示时可将 `.env` 的 `PUBLIC_MODE` 改为 `0`，使用源码中的演示账号。生产站密码单独管理。

如需中文翻译，在本地 `.env` 设置 `TRANS_API_KEY`。密钥只用于后端，不要提交到 GitHub。

## Cloudflare

架构：Pages 前端及 API Functions → 服务绑定 → Worker → SQLite Durable Object。日报使用 Cloudflare Cron，每天北京时间 08:00 运行；普通更新每天 08:00 和 20:00 运行。

```bash
npm run build:cloudflare
npm run test:cloudflare
```

新克隆的仓库没有生产数据库，Cloudflare 构建会自动使用公开模式的内容种子。若要迁移自己的数据，可在本地添加私有 `data/db.json`，它始终被 Git 排除。已有生产 Durable Object 的数据不会被代码重新部署覆盖。

详细配置、Secret、数据备份和发布步骤见 [CLOUDFLARE.md](CLOUDFLARE.md)。本仓库提交代码后不会自动发布到当前网站；需要按该说明执行发布。

## 版本历史

| 标签 | 内容 |
| --- | --- |
| [`delivery-20261009`](https://github.com/Leslie892-CMYK/lifesci-hub/tree/delivery-20261009) | 原始交付源码，Cloudflare 适配之前 |
| [`v1.0.0-cloudflare`](https://github.com/Leslie892-CMYK/lifesci-hub/tree/v1.0.0-cloudflare) | 2026-10-12 上线的 Cloudflare 源码 |
| `main` | 在上线源码基础上，完善公开仓库的文档和无生产数据库时的构建 |

两个历史标签都只保存源码，生产数据与凭据继续在独立备份中管理。早期版本构建 Cloudflare 时需提供私有数据库；`main` 可直接构建。

以后修改前创建分支并提交：

```bash
git switch -c feature/your-change
# 修改、构建并测试后
git add .
git commit -m "说明本次修改"
git push -u origin feature/your-change
```

通过 Pull Request 合并到 `main`，每次提交都会保存一个可查看、比较和恢复的代码版本。需要新的稳定版本时创建标签：

```bash
git tag -a v1.1.0 -m "本次稳定版本说明"
git push origin v1.1.0
```

修改前阅读 [交付文档.md](交付文档.md) 第 10 章。历史文章不删除，英文原题不覆盖，期刊匹配规则和百度封锁过期机制需保留。

## 主要文件

- `server/oph.js`：19 刊规则、采集、翻译和日报生成。
- `server/translate.js`：Node 百度 CLI 与 MyMemory 翻译通道。
- `cloudflare/build.mjs`：Express、文件存储、翻译及日报的 Cloudflare 适配。
- `cloudflare/worker.js`、`cloudflare/storage.js`：持久化、任务队列和定时任务。
- `src/`：React 页面和组件。
- [交付文档.md](交付文档.md)：原始项目交付约定。

GitHub 访问限制：仓库是公开的，任何人可以阅读；修改仓库需所有者授权，外部贡献可通过 Fork 和 Pull Request 提交。
