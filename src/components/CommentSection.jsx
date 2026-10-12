import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { api } from '../api.js';
import { timeAgo } from '../utils.js';

export default function CommentSection({ targetType, targetId, comments, onAdded }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [content, setContent] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (parentId) => {
    if (!user) return navigate('/login');
    const text = content.trim();
    if (!text) return;
    setBusy(true);
    setError('');
    try {
      const fns = {
        article: api.commentArticle,
        post: api.commentPost,
        competition: api.commentCompetition
      };
      const fn = fns[targetType] || api.commentPost;
      const data = await fn(targetId, { content: text, parentId });
      setContent('');
      setReplyTo(null);
      if (onAdded) onAdded(data.comment);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const tops = comments
    .filter((c) => !c.parentId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const repliesOf = (id) =>
    comments.filter((c) => c.parentId === id).sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const renderComment = (c, isReply) => (
    <div className="comment-item" key={c.id}>
      <span className="avatar" style={{ background: c.author?.color || '#0f8a5f' }}>
        {(c.author?.username || '?').slice(0, 1).toUpperCase()}
      </span>
      <div className="comment-body">
        <div className="comment-head">
          <span className="comment-author">{c.author?.username || '用户'}</span>
          {c.author?.role === 'admin' && <span className="nav-role">管理员</span>}
          {c.author?.role === 'editor' && <span className="nav-role">编辑</span>}
          <span className="comment-time">{timeAgo(c.createdAt)}</span>
        </div>
        <div className="comment-content">{c.content}</div>
        {!isReply && user && (
          <button className="reply-btn" onClick={() => { setReplyTo(c); setContent(''); }}>
            回复
          </button>
        )}
        {!isReply && repliesOf(c.id).length > 0 && (
          <div className="comment-replies">{repliesOf(c.id).map((r) => renderComment(r, true))}</div>
        )}
      </div>
    </div>
  );

  return (
    <div className="comments">
      <h3 className="comments-title">讨论 · {comments.length}</h3>

      {user ? (
        <div className="comment-form">
          {replyTo && (
            <div className="reply-hint">
              <span>回复 @{replyTo.author?.username}</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setReplyTo(null)}>取消回复</button>
            </div>
          )}
          <textarea
            placeholder={replyTo ? '写下你的回复…' : '友善讨论，分享你的观点…'}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          {error && <div className="form-error" style={{ marginBottom: 0 }}>{error}</div>}
          <div className="comment-form-actions">
            <span className="field-hint">评论支持换行，最多 2000 字</span>
            <button className="btn btn-primary btn-sm" disabled={busy || !content.trim()} onClick={() => submit(replyTo?.id)}>
              {busy ? '发布中…' : replyTo ? '回复' : '发表评论'}
            </button>
          </div>
        </div>
      ) : (
        <div className="comment-login-hint">
          <span>登录后即可参与讨论，与同行交流观点。</span>
          <Link to="/login" className="btn btn-soft btn-sm">去登录</Link>
        </div>
      )}

      {tops.length === 0 && !user && (
        <div className="empty" style={{ padding: '24px 0' }}>
          <p>还没有评论，来抢沙发吧。</p>
        </div>
      )}
      {tops.map((c) => renderComment(c, false))}
    </div>
  );
}
