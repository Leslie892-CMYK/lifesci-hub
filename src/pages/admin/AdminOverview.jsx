import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api.js';
import { timeAgo } from '../../utils.js';

function SyncCard() {
  const [meta, setMeta] = useState(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => api.syncStatus().then((d) => setMeta(d.meta)).catch(() => {});
  useEffect(() => {
    load();
    const t = setInterval(load, 15000); // 同步期间每 15s 刷新状态
    return () => clearInterval(t);
  }, []);

  const trigger = async () => {
    setBusy(true);
    setMsg('');
    try {
      await api.syncNow();
      setMsg('同步已触发，正在后台执行（约 1-2 分钟），稍后自动刷新状态。');
      setTimeout(load, 3000);
    } catch (e) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  };

  const last = meta?.lastSync;

  return (
    <div className="card aside-card" style={{ gridColumn: '1 / -1' }}>
      <div className="aside-title">
        🔄 自动更新状态
        {meta?.syncing ? <span className="chip chip-tech" style={{ marginLeft: 8 }}>同步中…</span> : null}
      </div>
      <div className="sync-row">
        {last ? (
          <>
            <span className="sync-item">上次同步：{timeAgo(last.at)}</span>
            <span className="sync-item">📰 新增顶刊文章：{last.journals?.added ?? '—'} 篇</span>
            <span className="sync-item">🏆 新增比赛通知：{last.competitions?.added ?? '—'} 条</span>
            {last.journals?.errors?.length > 0 && (
              <span className="sync-item" style={{ color: '#b91c1c' }}>⚠️ 有 {last.journals.errors.length} 个期刊源出错</span>
            )}
            {last.competitions?.errors?.length > 0 && (
              <span className="sync-item" style={{ color: '#b91c1c' }}>⚠️ 学校官网抓取出错</span>
            )}
          </>
        ) : (
          <span className="sync-item">尚未执行过同步（服务启动后会自动执行）</span>
        )}
        <button className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }} disabled={busy || meta?.syncing} onClick={trigger}>
          {busy ? '触发中…' : meta?.syncing ? '同步进行中…' : '⚡ 立即同步'}
        </button>
      </div>
      {msg && <p className="field-hint" style={{ margin: '10px 0 0' }}>{msg}</p>}
      <p className="field-hint" style={{ margin: '10px 0 0' }}>
        服务每 12 小时自动同步：顶刊文献（PubMed，含 DOI 原文链接）与学校创新创业学院官网（cxcy.hmc.edu.cn）竞赛通知；
        也可用 <code>npm run update</code> 手动执行。
      </p>
    </div>
  );
}

function TranslateCard() {
  const [st, setSt] = useState(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState('');

  const load = (probe) =>
    api.translateStatus(probe).then(setSt).catch(() => {});

  useEffect(() => {
    load();
  }, []);

  const probe = async () => {
    setBusy('probe');
    setMsg('');
    try {
      const d = await api.translateStatus(true);
      setSt(d);
      setMsg(d.doctor?.allOk ? '✅ 百度翻译通道正常，可以开始补翻。' : `⚠️ 百度翻译不可用：${d.doctor?.reason || '未知原因'}`);
    } catch (e) {
      setMsg(e.message);
    } finally {
      setBusy('');
    }
  };

  const backfill = async () => {
    setBusy('backfill');
    setMsg('正在翻译，请稍候（百度的速度约每秒 1-2 条）…');
    try {
      const d = await api.translateBackfill(100);
      const r = d.report || {};
      setMsg(`本轮完成：成功 ${r.ok ?? 0} 条，失败 ${r.fail ?? 0} 条，剩余待翻译 ${Math.max((r.pending ?? 0) - (r.ok ?? 0), 0)} 条（用时 ${r.seconds ?? '—'} 秒）。`);
      load();
    } catch (e) {
      setMsg(e.message);
    } finally {
      setBusy('');
    }
  };

  // 摘要重译：英文摘要原文保持不变，只把早期机翻的中文摘要换成百度译文
  const retranslateAbstracts = async () => {
    if (!window.confirm('将用百度翻译重译眼科AI稿件的【中文摘要】（英文摘要原文保持不变，旧中文摘要保留在 abstractCnPrev 字段）。\n\n注意：摘要较长，会消耗百度翻译额度，每篇约 1000-1500 字符。继续？')) return;
    setBusy('abstracts');
    setMsg('正在重译中文摘要（每篇约 3-5 秒）…');
    try {
      const d = await api.translateAbstracts(8, 20000);
      const r = d.report || {};
      setMsg(`摘要重译完成：成功 ${r.ok ?? 0} 篇，失败 ${r.fail ?? 0} 篇，共消耗约 ${r.chars ?? 0} 字符（稿件共 ${r.total ?? 0} 篇待重译）。`);
      load();
    } catch (e) {
      setMsg(e.message);
    } finally {
      setBusy('');
    }
  };

  // 重译：早期 MyMemory 机翻的专业术语容易出错（如 multimodal agent → 多式联运AI药剂），用百度重译
  const retranslateOph = async () => {
    if (!window.confirm('将用百度翻译重译眼科AI文章的中文标题（旧译文会保留在 titleCnPrev 字段中，不会删除）。继续？')) return;
    setBusy('retranslate');
    setMsg('正在重译眼科AI标题…');
    try {
      const d = await api.translateBackfill(200, { force: true, scope: 'oph' });
      const r = d.report || {};
      setMsg(`眼科AI重译完成：成功 ${r.ok ?? 0} 条，失败 ${r.fail ?? 0} 条（用时 ${r.seconds ?? '—'} 秒）。旧译文已保留可追溯。`);
      load();
    } catch (e) {
      setMsg(e.message);
    } finally {
      setBusy('');
    }
  };

  const b = st?.baidu;
  const t = st?.titles;
  const ok = !!b?.usable;

  return (
    <div className="card aside-card" style={{ gridColumn: '1 / -1' }}>
      <div className="aside-title">
        🌐 中文翻译通道
        <span className={`chip ${ok ? 'chip-tech' : ''}`} style={{ marginLeft: 8 }}>
          {ok ? '百度翻译（可用）' : 'MyMemory 兜底'}
        </span>
      </div>
      <div className="sync-row" style={{ flexWrap: 'wrap', gap: 12 }}>
        <span className="sync-item">📄 已有中文标题：{t?.translated ?? '—'} / {t?.total ?? '—'}</span>
        <span className="sync-item" style={{ color: t?.pending ? '#b45309' : undefined }}>
          ⏳ 待翻译：{t?.pending ?? '—'} 篇
        </span>
        <span className="sync-item">调用：{b?.calls ?? 0} 次，成功 {b?.ok ?? 0} 次</span>
        <button className="btn btn-sm" style={{ marginLeft: 'auto' }} disabled={!!busy} onClick={probe}>
          {busy === 'probe' ? '检测中…' : '🔍 检测通道'}
        </button>
        <button className="btn btn-primary btn-sm" disabled={!!busy || !t?.pending} onClick={backfill}>
          {busy === 'backfill' ? '翻译中…' : '⚡ 立即补翻 100 条'}
        </button>
        <button className="btn btn-sm" disabled={!!busy} onClick={retranslateOph}>
          {busy === 'retranslate' ? '重译中…' : '🔁 重译眼科AI标题'}
        </button>
        <button className="btn btn-sm" disabled={!!busy} onClick={retranslateAbstracts}>
          {busy === 'abstracts' ? '摘要重译中…' : '📄 重译摘要（8 篇）'}
        </button>
      </div>
      {!ok && (
        <p className="field-hint" style={{ margin: '10px 0 0', color: '#b45309' }}>
          百度通道未启用（{b?.blockCode === 'CLI_MISSING' ? '未安装 trans-cli' : b?.blockMessage || '未配置 API Key'}）。
          在项目根目录 <code>.env</code> 中填写 <code>TRANS_API_KEY=你的Key</code> 后重启服务，即可启用百度翻译。
        </p>
      )}
      {ok && (
        <p className="field-hint" style={{ margin: '10px 0 0' }}>
          百度翻译已启用：新抓取的文献标题、眼科AI日报的中文标题与中文摘要都会优先走百度，速度快且专业术语更准确。
        </p>
      )}
      <p className="field-hint" style={{ margin: '10px 0 0' }}>
        系统每天 8:00 生成眼科AI日报时会自动补翻一批中文标题；也可点上方按钮立即补翻（每轮 100 条，每小时最多 10 次）。
      </p>
      {msg && <p className="field-hint" style={{ margin: '10px 0 0' }}>{msg}</p>}
    </div>
  );
}

export default function AdminOverview() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.adminStats().then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="form-error">{error}</div>;
  if (!data) return <div className="loading">加载中…</div>;

  const c = data.counts;
  const cards = [
    { label: '文章', num: c.articles, to: '/admin?tab=articles' },
    { label: '比赛通知', num: c.competitions, to: '/admin?tab=competitions' },
    { label: '社区', num: c.communities, to: '/admin?tab=communities' },
    { label: '帖子', num: c.posts, to: '/admin?tab=posts' },
    { label: '评论', num: c.comments, to: '/admin?tab=comments' },
    { label: '精选工具', num: c.repo, to: '/admin?tab=repo' },
    { label: '注册用户', num: c.users, to: '/admin?tab=users' },
    { label: '今日发布', num: c.todayArticles, to: '/publish' }
  ];

  return (
    <div>
      <div className="admin-stat-grid">
        {cards.map((card) => (
          <Link key={card.label} to={card.to} className="admin-stat">
            <div className="num">{card.num}</div>
            <div className="label">{card.label}</div>
          </Link>
        ))}
      </div>

      <div className="grid-3" style={{ alignItems: 'start' }}>
        <div className="card aside-card">
          <div className="aside-title">📰 最新文章</div>
          {data.recentArticles.map((a) => (
            <Link key={a.id} to={`/articles/${a.id}`} className="admin-list-item">
              <span className="title">{a.title}</span>
              <span className="time">{timeAgo(a.publishedAt)}</span>
            </Link>
          ))}
        </div>
        <div className="card aside-card">
          <div className="aside-title">💬 最新帖子</div>
          {data.recentPosts.map((p) => (
            <Link key={p.id} to={`/posts/${p.id}`} className="admin-list-item">
              <span className="title">{p.title}</span>
              <span className="time">{timeAgo(p.createdAt)}</span>
            </Link>
          ))}
        </div>
        <div className="card aside-card">
          <div className="aside-title">👤 最新用户</div>
          {data.recentUsers.map((u) => (
            <div key={u.id} className="admin-list-item">
              <span className="avatar avatar-sm" style={{ background: u.color }}>
                {u.username.slice(0, 1).toUpperCase()}
              </span>
              <span className="title">{u.username}</span>
              <span className="time">{u.role === 'admin' ? '管理员' : u.role === 'editor' ? '编辑' : '用户'}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid-3" style={{ alignItems: 'start', marginTop: 0 }}>
        <SyncCard />
        <TranslateCard />
      </div>
    </div>
  );
}
