import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import CommentSection from '../components/CommentSection.jsx';
import { HeartIcon, CommentIcon } from '../components/Icons.jsx';
import { POST_TYPE_META, fmtDateTime, renderParagraphs } from '../utils.js';

export default function PostDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [error, setError] = useState('');
  const [likeBusy, setLikeBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    setError('');
    api
      .post(id)
      .then((d) => {
        if (!alive) return;
        setPost(d.post);
        setComments(d.comments);
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
      const info = await api.likePost(id);
      setPost({ ...post, likes: info.count, liked: info.liked });
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
          <div className="icon">📝</div>
          <h3>{error}</h3>
          <Link to="/communities" className="btn btn-primary">返回社区</Link>
        </div>
      </div>
    );
  }

  if (!post) return <div className="loading">加载中…</div>;

  const type = POST_TYPE_META[post.type] || POST_TYPE_META.discussion;
  const isRecruit = post.type === 'recruit_teammate' || post.type === 'recruit_member';

  return (
    <div className="container">
      <div className="breadcrumb">
        <Link to="/">首页</Link> / <Link to="/communities">社区</Link> /
        {post.community && <Link to={`/communities/${post.community.slug || post.community.id}`}>{post.community.name}</Link>} /
        <span>帖子</span>
      </div>

      <div className="card post-detail">
        <span className={`chip chip-type-${post.type}`}>{type.icon} {type.label}</span>
        <h1>{post.title}</h1>
        <div className="meta-row" style={{ marginBottom: 14 }}>
          <span className="author-chip">
            <span className="avatar avatar-sm" style={{ background: post.author?.color || '#0f8a5f' }}>
              {(post.author?.username || '?').slice(0, 1).toUpperCase()}
            </span>
            {post.author?.username || '用户'}
          </span>
          <span>{fmtDateTime(post.createdAt)}</span>
          <span className="meta-item"><HeartIcon width={13} height={13} />{post.likes}</span>
          <span className="meta-item"><CommentIcon width={13} height={13} />{comments.length}</span>
        </div>

        {isRecruit && (
          <div className="recruit-card">
            <span>📣 <b>{type.label}帖</b></span>
            <span>发布者：<b>{post.author?.username}</b></span>
            <span>所在社区：<b>{post.community?.name}</b></span>
            <span>📌 有意者请在评论区留言，帖主会联系你</span>
          </div>
        )}

        <div className="post-content">
          {renderParagraphs(post.content).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>

        <div className="detail-tags">
          {(post.tags || []).map((t) => (
            <span key={t} className="tag">#{t}</span>
          ))}
        </div>

        <div className="detail-actions">
          <button className={`like-btn ${post.liked ? 'liked' : ''}`} disabled={likeBusy} onClick={like}>
            <HeartIcon width={15} height={15} fill={post.liked ? 'currentColor' : 'none'} />
            {post.liked ? '已点赞' : '点赞'} {post.likes}
          </button>
          {post.community && (
            <Link to={`/communities/${post.community.slug || post.community.id}`} className="btn btn-outline btn-sm">
              返回 {post.community.name}
            </Link>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: 20, padding: '24px 34px' }}>
        <CommentSection
          targetType="post"
          targetId={post.id}
          comments={comments}
          onAdded={(c) => setComments([...comments, c])}
        />
      </div>
    </div>
  );
}
