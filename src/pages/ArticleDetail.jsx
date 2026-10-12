import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import CommentSection from '../components/CommentSection.jsx';
import { HeartIcon, EyeIcon, CommentIcon } from '../components/Icons.jsx';
import { CATEGORY_META, JOURNAL_COLORS, fmtDateTime, renderParagraphs } from '../utils.js';

export default function ArticleDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [article, setArticle] = useState(null);
  const [comments, setComments] = useState([]);
  const [related, setRelated] = useState([]);
  const [error, setError] = useState('');
  const [likeBusy, setLikeBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    setError('');
    api
      .article(id)
      .then((d) => {
        if (!alive) return;
        setArticle(d.article);
        setComments(d.comments);
        return api.articles({ category: d.article.category });
      })
      .then((d) => {
        if (alive && d) setRelated(d.items.filter((x) => x.id !== Number(id)).slice(0, 3));
      })
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [id]);

  const like = async () => {
    if (!user) return navigate('/login');
    setLikeBusy(true);
    try {
      const info = await api.likeArticle(id);
      setArticle({ ...article, likes: info.count, liked: info.liked });
    } catch (e) {
      setError(e.message);
    } finally {
      setLikeBusy(false);
    }
  };

  if (error) {
    return (
      <div className="container">
        <div className="empty">
          <div className="icon">📄</div>
          <h3>{error}</h3>
          <Link to="/articles" className="btn btn-primary">返回文章列表</Link>
        </div>
      </div>
    );
  }

  if (!article) return <div className="loading">加载中…</div>;

  const cat = CATEGORY_META[article.category] || { label: '资讯' };

  return (
    <div className="container">
      <div className="breadcrumb">
        <Link to="/">首页</Link> / <Link to="/articles">顶刊动态</Link> / <span>{cat.label}</span>
      </div>

      <div className="detail-layout">
        <div>
          <article className="card article-detail">
            <div className="article-card-top">
              {article.journal && (
                <span className="journal-badge" style={{ background: JOURNAL_COLORS[article.journal] || '#64748b' }}>
                  {article.journal}
                </span>
              )}
              <span className={`chip chip-${article.category}`}>{cat.label}</span>
            </div>
            {(() => {
              const hasCjk = /[\u4e00-\u9fa5]/.test(String(article.title || ''));
              const cnTitle = article.titleCn || (hasCjk ? article.title : '');
              const enTitle = article.titleCn ? article.title : '';
              return (
                <>
                  <h1>{cnTitle || article.title}</h1>
                  {enTitle && <div className="article-title-en article-title-en-detail">英文原题：{enTitle}</div>}
                  {!cnTitle && !hasCjk && (
                    <div className="article-title-status">中文标题翻译暂不可用，当前显示英文原题</div>
                  )}
                </>
              );
            })()}
            {article.impactFactorRef && (
              <div className="meta-row" style={{ marginTop: 6 }}>
                <span>影响因子 ≈{article.impactFactorRef}（参考值，以官方为准）</span>
              </div>
            )}
            <div className="meta-row">
              <span>发布：{article.author?.username || '编辑部'}</span>
              <span>{fmtDateTime(article.publishedAt)}</span>
              <span className="meta-item"><EyeIcon width={13} height={13} />{article.views} 阅读</span>
              <span className="meta-item"><CommentIcon width={13} height={13} />{comments.length} 评论</span>
            </div>
            {article.authors && (
              <div className="meta-row" style={{ marginTop: 6 }}>
                <span>作者：{article.authors}</span>
                {article.doi && (
                  <a
                    className="doi-link"
                    href={`https://doi.org/${article.doi}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    DOI: {article.doi} ↗
                  </a>
                )}
              </div>
            )}

            <div className="article-summary-box">{article.summary}</div>

            <div className="article-content">
              {renderParagraphs(article.content).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>

            <div className="detail-tags">
              {(article.tags || []).map((t) => (
                <span key={t} className="tag">#{t}</span>
              ))}
            </div>

            <div className="detail-actions">
              <button className={`like-btn ${article.liked ? 'liked' : ''}`} disabled={likeBusy} onClick={like}>
                <HeartIcon width={15} height={15} fill={article.liked ? 'currentColor' : 'none'} />
                {article.liked ? '已点赞' : '点赞'} {article.likes}
              </button>
              <span className="field-hint">觉得有价值？点个赞让更多人看到</span>
            </div>
          </article>

          <div className="card" style={{ marginTop: 20, padding: '24px 34px' }}>
            <CommentSection
              targetType="article"
              targetId={article.id}
              comments={comments}
              onAdded={(c) => setComments([...comments, c])}
            />
          </div>
        </div>

        <aside className="detail-side">
          <div className="card aside-card">
            <div className="aside-title">📚 相关文章</div>
            {related.map((a) => (
              <Link key={a.id} to={`/articles/${a.id}`} className="aside-item">
                <span className="aside-item-title" style={{ whiteSpace: 'normal' }}>{a.title}</span>
              </Link>
            ))}
          </div>
          <div className="card aside-card">
            <div className="aside-title">🧭 快速导航</div>
            <Link to="/articles?category=journal" className="aside-item"><span className="aside-item-title">顶刊文章</span><span className="aside-item-meta">→</span></Link>
            <Link to="/articles?category=tech" className="aside-item"><span className="aside-item-title">新兴技术</span><span className="aside-item-meta">→</span></Link>
            <Link to="/communities" className="aside-item"><span className="aside-item-title">科研社区</span><span className="aside-item-meta">→</span></Link>
            <Link to="/recruit" className="aside-item"><span className="aside-item-title">招募组队</span><span className="aside-item-meta">→</span></Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
