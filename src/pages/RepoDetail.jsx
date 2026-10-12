import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { HeartIcon, EyeIcon } from '../components/Icons.jsx';
import { REPO_TYPE_META, REPO_CATEGORY_META, fmtDate, renderParagraphs } from '../utils.js';

function CodeBlock({ title, code }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 剪贴板不可用时静默失败
    }
  };
  return (
    <div>
      <div className="code-head">
        <span className="code-title">{title}</span>
        <button className="copy-btn" onClick={copy}>{copied ? '已复制 ✓' : '📋 复制'}</button>
      </div>
      <pre className="code-block">{code}</pre>
    </div>
  );
}

export default function RepoDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [related, setRelated] = useState([]);
  const [error, setError] = useState('');
  const [favBusy, setFavBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let alive = true;
    setError('');
    api
      .repoItem(id)
      .then((d) => {
        if (!alive) return;
        setItem(d.item);
        setRelated(d.related);
      })
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [id]);

  const favorite = async () => {
    if (!user) return navigate('/login');
    setFavBusy(true);
    try {
      const info = await api.favoriteRepo(id);
      setItem({ ...item, favorites: info.count, favorited: info.liked });
    } catch (e) {
      setError(e.message);
    } finally {
      setFavBusy(false);
    }
  };

  const download = async () => {
    // 先打开新窗口（保持用户手势，避免被浏览器拦截），再异步计数
    window.open(item.downloadUrl, '_blank', 'noopener');
    setDownloading(true);
    try {
      const d = await api.downloadRepo(id);
      setItem({ ...item, downloads: d.downloadCount });
    } catch (e) {
      console.error(e);
    } finally {
      setDownloading(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`确定删除「${item.name}」吗？该操作不可恢复。`)) return;
    try {
      await api.deleteRepo(id);
      navigate('/repo');
    } catch (e) {
      setError(e.message);
    }
  };

  if (error) {
    return (
      <div className="container">
        <div className="empty">
          <div className="icon">🧰</div>
          <h3>{error}</h3>
          <Link to="/repo" className="btn btn-primary">返回工具仓库</Link>
        </div>
      </div>
    );
  }

  if (!item) return <div className="loading">加载中…</div>;

  const type = REPO_TYPE_META[item.type] || REPO_TYPE_META.skill;
  const cat = REPO_CATEGORY_META[item.category] || { label: item.category, icon: '📦' };

  return (
    <div className="container">
      <div className="breadcrumb">
        <Link to="/">首页</Link> / <Link to="/repo">科研工具仓库</Link> / <span>{item.name}</span>
      </div>

      <div className="detail-layout">
        <div>
          <article className="card repo-detail">
            <div className="repo-detail-head">
              <span className="repo-logo" style={{ background: item.color || '#0f8a5f' }}>{item.logo || '🧰'}</span>
              <div style={{ flex: 1, minWidth: 200 }}>
                <h1>{item.name}</h1>
                <div className="meta-row">
                  <span>作者：{item.author}</span>
                  {item.submittedBy && <span>收录：{item.submittedBy.username}</span>}
                  <span>收录于 {fmtDate(item.createdAt)}</span>
                </div>
              </div>
            </div>

            <div className="article-card-top" style={{ marginBottom: 14 }}>
              <span className={`chip chip-type-${item.type}`}>{type.icon} {type.label}</span>
              <span className="chip repo-cat">{cat.icon} {cat.label}</span>
            </div>

            <div className="repo-stats">
              <span>⭐ {item.stars} 星标</span>
              <span>⬇ {item.downloads} 次下载</span>
              <span>♥ {item.favorites} 人收藏</span>
              <span><EyeIcon width={13} height={13} /> {item.views} 次浏览</span>
            </div>

            <div className="repo-btns">
              <button className="btn btn-primary" onClick={download} disabled={downloading}>
                ⬇ 下载 / 获取
              </button>
              <a className="btn btn-outline" href={item.downloadUrl} target="_blank" rel="noreferrer">
                源码仓库 ↗
              </a>
              {item.homepage && (
                <a className="btn btn-outline" href={item.homepage} target="_blank" rel="noreferrer">
                  官方主页 ↗
                </a>
              )}
              <button className={`like-btn ${item.favorited ? 'liked' : ''}`} disabled={favBusy} onClick={favorite}>
                <HeartIcon width={15} height={15} fill={item.favorited ? 'currentColor' : 'none'} />
                {item.favorited ? '已收藏' : '收藏'}
              </button>
              {user?.role === 'admin' && (
                <button className="btn btn-outline btn-sm danger" onClick={remove}>删除</button>
              )}
            </div>

            <div className="detail-tags">
              {(item.tags || []).map((t) => (
                <span key={t} className="tag">#{t}</span>
              ))}
            </div>

            <div className="article-summary-box">{item.summary}</div>

            <div className="article-content">
              {renderParagraphs(item.description).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>

            {item.highlights?.length > 0 && (
              <>
                <div className="repo-section-title">功能亮点</div>
                <ul className="highlight-list">
                  {item.highlights.map((h, i) => <li key={i}>{h}</li>)}
                </ul>
              </>
            )}

            {item.install && <CodeBlock title="安装方式" code={item.install} />}
            {item.usage && <CodeBlock title="使用示例" code={item.usage} />}
          </article>
        </div>

        <aside className="detail-side">
          <div className="card aside-card">
            <div className="aside-title">🛠️ 相关推荐</div>
            {related.map((r) => (
              <Link key={r.id} to={`/repo/${r.id}`} className="aside-item">
                <span>{r.logo}</span>
                <span className="aside-item-title">{r.name}</span>
                <span className="aside-item-meta">⭐ {r.stars}</span>
              </Link>
            ))}
          </div>
          <div className="card aside-card">
            <div className="aside-title">🧭 快速导航</div>
            <Link to="/repo" className="aside-item"><span className="aside-item-title">全部工具</span><span className="aside-item-meta">→</span></Link>
            <Link to="/repo?type=mcp" className="aside-item"><span className="aside-item-title">🔌 MCP 服务器</span><span className="aside-item-meta">→</span></Link>
            <Link to="/repo?type=skill" className="aside-item"><span className="aside-item-title">🧩 Agent Skill</span><span className="aside-item-meta">→</span></Link>
            <Link to="/repo/submit" className="aside-item"><span className="aside-item-title">提交精选工具</span><span className="aside-item-meta">→</span></Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
