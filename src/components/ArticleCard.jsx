import { Link } from 'react-router-dom';
import { CATEGORY_META, JOURNAL_COLORS, timeAgo } from '../utils.js';
import { CommentIcon, EyeIcon } from './Icons.jsx';

function hasCjk(text) {
  return /[\u4e00-\u9fa5]/.test(String(text || ''));
}

export default function ArticleCard({ article }) {
  const cat = CATEGORY_META[article.category] || { label: '资讯' };
  // 中文标题优先；无中文标题时保留英文原题并标注状态
  const cnTitle = article.titleCn || (hasCjk(article.title) ? article.title : '');
  const enTitle = cnTitle && article.titleCn ? article.title : '';
  const needsTranslation = !cnTitle && !hasCjk(article.title);
  return (
    <article className="card card-hover article-card">
      <div className="article-card-top">
        {article.journal && (
          <span className="journal-badge" style={{ background: JOURNAL_COLORS[article.journal] || '#64748b' }}>
            {article.journal}
          </span>
        )}
        {article.impactFactorRef && (
          <span className="chip chip-soft" style={{ background: '#fdf3e0', color: '#b45309' }}>
            IF ≈{article.impactFactorRef}
          </span>
        )}
        <span className={`chip chip-${article.category}`}>{cat.label}</span>
      </div>
      {cnTitle ? (
        <>
          <Link to={`/articles/${article.id}`} className="article-title article-title-cn">
            {cnTitle}
          </Link>
          {enTitle && <div className="article-title-en">{enTitle}</div>}
        </>
      ) : (
        <>
          <Link to={`/articles/${article.id}`} className="article-title">
            {article.title}
          </Link>
          {needsTranslation && <div className="article-title-status">英文原题（中文标题待生成）</div>}
        </>
      )}
      <p className="article-summary">{article.summary}</p>
      <div className="article-tags">
        {(article.tags || []).slice(0, 3).map((t) => (
          <span key={t} className="tag">#{t}</span>
        ))}
      </div>
      <div className="meta-row">
        <span>{article.author?.username || '编辑部'}</span>
        <span>{timeAgo(article.publishedAt)}</span>
        <span className="meta-item"><EyeIcon width={13} height={13} />{article.views}</span>
        <span className="meta-item"><CommentIcon width={13} height={13} />{article.comments}</span>
      </div>
    </article>
  );
}
