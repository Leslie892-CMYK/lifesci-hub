import { Link } from 'react-router-dom';
import { REPO_TYPE_META, REPO_CATEGORY_META } from '../utils.js';
import { HeartIcon } from './Icons.jsx';

export default function RepoCard({ item }) {
  const type = REPO_TYPE_META[item.type] || REPO_TYPE_META.skill;
  const cat = REPO_CATEGORY_META[item.category] || { label: item.category, icon: '📦' };
  return (
    <article className="card card-hover repo-card">
      <div className="repo-card-top">
        <span className="repo-logo" style={{ background: item.color || '#0f8a5f' }}>{item.logo || '🧰'}</span>
        <div className="repo-card-badges">
          <span className={`chip chip-type-${item.type}`}>{type.icon} {type.label}</span>
          <span className="chip repo-cat">{cat.icon} {cat.label}</span>
        </div>
      </div>
      <Link to={`/repo/${item.id}`} className="repo-name">{item.name}</Link>
      <p className="article-summary">{item.summary}</p>
      <div className="article-tags">
        {(item.tags || []).slice(0, 3).map((t) => (
          <span key={t} className="tag">#{t}</span>
        ))}
      </div>
      <div className="meta-row">
        <span>{item.author}</span>
        <span className="meta-item">⭐ {item.stars}</span>
        <span className="meta-item">⬇ {item.downloads}</span>
        <span className="meta-item">
          <HeartIcon width={12} height={12} fill={item.favorited ? 'currentColor' : 'none'} />{item.favorites}
        </span>
      </div>
    </article>
  );
}
