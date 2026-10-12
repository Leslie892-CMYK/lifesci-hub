import { Link } from 'react-router-dom';
import { POST_TYPE_META, timeAgo } from '../utils.js';
import { CommentIcon, HeartIcon } from './Icons.jsx';

export default function PostCard({ post, showCommunity = true }) {
  const type = POST_TYPE_META[post.type] || POST_TYPE_META.discussion;
  return (
    <article className="card card-hover post-card">
      <div className="post-card-top">
        <span className={`chip chip-type-${post.type}`}>
          {type.icon} {type.label}
        </span>
        {showCommunity && post.community && (
          <Link to={`/communities/${post.community.slug || post.community.id}`} className="community-chip" style={{ color: post.community.color }}>
            {post.community.name}
          </Link>
        )}
      </div>
      <Link to={`/posts/${post.id}`} className="post-title">
        {post.title}
      </Link>
      <p className="post-excerpt">{post.content}</p>
      <div className="article-tags">
        {(post.tags || []).slice(0, 4).map((t) => (
          <span key={t} className="tag">#{t}</span>
        ))}
      </div>
      <div className="meta-row">
        <span className="author-chip">
          <span className="avatar avatar-sm" style={{ background: post.author?.color || '#0f8a5f' }}>
            {(post.author?.username || '?').slice(0, 1).toUpperCase()}
          </span>
          {post.author?.username || '用户'}
        </span>
        <span>{timeAgo(post.createdAt)}</span>
        <span className="meta-item">
          <HeartIcon width={13} height={13} fill={post.liked ? 'currentColor' : 'none'} />{post.likes}
        </span>
        <span className="meta-item"><CommentIcon width={13} height={13} />{post.comments}</span>
      </div>
    </article>
  );
}
