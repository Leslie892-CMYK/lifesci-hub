# LifeSciHub Cloudflare 部署与接手说明

生产网址：[https://lifesci-hub.pages.dev](https://lifesci-hub.pages.dev)
后台：[https://lifesci-hub.pages.dev/admin](https://lifesci-hub.pages.dev/admin)

这是 Pages 项目默认的固定生产地址，不需要购买域名。只要 Cloudflare 账户、项目及绑定服务继续有效，它就能持续使用；版本预览地址不作为主入口。

## 当前部署

- Pages 项目：`lifesci-hub`；前端文件在 `dist/`，API 使用 `functions/api/[[path]].js`。
- 后端 Worker：`lifesci-hub-backend`，通过 Pages 的 `LIFESCI_BACKEND` 服务绑定访问。
- 持久化：单个 SQLite Durable Object `LifeSciApp`（对象名 `main`）。数据库、日报、翻译缓存通过分块虚拟文件层保存，代码重发和电脑关机不会清空数据。
- Cron：`0 0,12 * * *`，以 UTC 配置。北京时间每天 08:00 执行眼科日报及普通更新，20:00 执行普通更新；日报日期固定为北京时间。
- 普通同步请求进入持久任务队列，使用 Durable Object Alarm 运行，避免浏览器断开后任务被中止。
- 保留原有 592 篇论文、7 个社区、10 篇帖子、6 个账号，以及 54 份历史日报。英文原题不覆盖，期刊仍为指定 19 本。

原服务器的进程启动定时器已由 Cloudflare Cron 接管，部署更新不会额外触发一次采集。Cloudflare 版本通过 `cloudflare/build.mjs` 适配原 `server/`，Node 原源码仍可本地运行。

2026-10-12 最终验收：实际眼科采集完成，`errors=[]`、`complete=true`，两份当日日报生成成功。本轮没有符合当天发表条件的新论文；加上原 54 份历史文件，线上现有 56 份日报。百度检测 `allOk=true`。8 项相关测试全部通过。当前后端版本：`758db467-8edb-43b3-a5e6-1f81aad763db`。

## 登录与日常使用

管理员用户名为 `admin`。公开站已更换所有旧账号的弱密码并清空旧会话，`admin123` 无法登录。当前密码另存于交付目录 `cloudflare-accounts.json`，不在源码包中。登录后可在个人账号页修改密码；修改后该文件中的旧密码将失效。

后台可以编辑文章、社区、帖子、资源、竞赛并检测翻译通道。眼科页可浏览论文和下载日报。首次上线已验证管理员登录、权限限制、19 刊清单、历史 docx 下载、报告生成、百度翻译检测及持久化。

## 百度翻译与 PubMed

Cloudflare 无法启动本地 CLI 子进程，因此使用与百度官方 CLI 相同的 HTTP 接口：
`https://fanyi-api.baidu.com/ait/api/agent/text/translate`。
`TRANS_API_KEY` 已配置为 Worker Secret，源码包没有密钥。成功译文持久化缓存；英文原题保留，失败不写入部分译文；封锁状态会到期恢复。

PubMed 无 API Key 时按出口 IP 限流；Cloudflare 共享出口可能收到 HTTP 429。已加入串行请求、550ms 间隔、最多四次请求、退避重试、Retry-After 和持续限流后的短时冷却。查询错误不会作为空数据处理。若采集仍失败，日报会明确提示数据可能不完整，同时保留历史数据；后台状态会保存具体错误。

可选配置专用 NCBI API Key 来提高稳定性，不能保证完全消除上游故障：

```bash
npx wrangler@4.105.0 secret put NCBI_API_KEY --config cloudflare/wrangler.jsonc
```

可选 `NCBI_EMAIL` 为真实维护者邮箱；勿用虚构邮箱。NCBI 官方说明：https://www.ncbi.nlm.nih.gov/books/NBK25497/

## 本地运行与重新部署

建议 Node 22.13+（测试使用 `node:sqlite`）和 Python 3（交付打包）。先阅读原交付文档第 10 章，修改前备份；不得删除历史论文、覆盖英文原题或恢复子串期刊匹配。

```bash
npm ci
cp .env.example .env
# 如需本地翻译，填写 .env 的 TRANS_API_KEY
npm run build
npm start
```

本地使用快照内账号；当前生产密码另见密码文件。Cloudflare Secret 与本地 `.env` 分别管理，不会自动同步。源码包中的数据库快照已清空会话，不包含生产密钥。

更新当前 Cloudflare 账户中的站点：

```bash
npx wrangler@4.105.0 whoami
npm run build:cloudflare
npm run test:cloudflare
npx wrangler@4.105.0 deploy --config cloudflare/wrangler.jsonc
npx wrangler@4.105.0 pages deploy dist --project-name lifesci-hub --branch main
```

若只改后端，可以省略最后一条 Pages 发布。日常重新部署不会覆盖已有 Durable Object 数据。`generated/bootstrap.json` 只用于空存储的首次初始化。构建时生成的 `cloudflare/private/accounts.json` 也是首次初始化凭据，不能用它推断已有生产站当前密码。

在全新账户或新项目上部署，需先创建 Pages 项目、发布后端并配置服务绑定和 `TRANS_API_KEY` Secret；勿直接重用本生产存储做试验。当前账户已授权，无需为了日常使用重复登录。

## 数据备份与交付包

管理员登录后可请求 `GET /api/admin/backup/export` 下载数据库 JSON（需 Bearer 会话）。该接口仅管理员可访问；导出包含会话数据，保存或分享前应清空 `sessions`，并妥善保管账号哈希。日报可通过 `/api/oph/reports` 列表和下载接口单独备份。应用保留自动数据库备份，但建议另存到独立位置。

```bash
npm run build:cloudflare
bash pack-delivery.sh /你希望保存的位置/lifesci-hub-Cloudflare.zip
```

打包脚本排除 `.env`、`.dev.vars`、密钥、账号明文、运行缓存、依赖和日志；只包含清空会话的数据快照。源码包内 `交付文档.md` 记录原始交付状态，本说明记录 Cloudflare 变更。

## 后续完善顺序

1. 观察每天 08:00 的采集结果；若持续限流，再配置专用 NCBI API Key，并完善任务失败告警。
2. 为日报历史归档增加更清晰的页面、采集状态和检索入口。
3. 将期刊清单做成后台编辑功能，修改时保留变更记录并验证 19 刊规则。
4. 按使用量再考虑 SQLite 表结构迁移、收藏、头像上传与富文本编辑器。

当前数据层仍按原 JSON 业务模型运行，SQLite 负责可靠持久化，适合当前规模。公共托管服务有配额及计费规则，固定网址不等于无限资源或永久免费承诺；无需购置 VPS 即可运行当前部署。
