import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import PostCard from '../components/PostCard.jsx';
import { PlusIcon, UsersIcon, FileIcon } from '../components/Icons.jsx';
import { COMMUNITY_TYPE_META, POST_TYPES } from '../utils.js';

const EMPTY_FORM = { title: '', content: '', type: 'discussion', tags: '' };

export default function CommunityDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [community, setCommunity] = useState(null);
  const [posts, setPosts] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);

  const load = () => {
    setLoading(true);
    api
      .community(id)
      .then((d) => {
        setCommunity(d);
        setPosts(d.posts);
        setForm({
          ...EMPTY_FORM,
          type: d.type === 'recruitment' || d.type === 'competition' ? 'recruit_teammate' : 'discussion'
        });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const join = async () => {
    if (!user) return navigate('/login');
    try {
      const data = await api.joinCommunity(community.id);
      setCommunity({ ...community, joined: data.joined, memberCount: data.memberCount });
    } catch (e) {
      setError(e.message);
    }
  };

  const createPost = async (e) => {
    e.preventDefault();
    if (!user) return navigate('/login');
    setBusy(true);
    setError('');
    try {
      const data = await api.createPost(community.id, {
        title: form.title,
        content: form.content,
        type: form.type,
        tags: form.tags
      });
      setPosts([data.post, ...posts]);
      setShowForm(false);
      setForm({ ...EMPTY_FORM, type: form.type });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="container"><div className="loading">加载中…</div></div>;

  if (error && !community) {
    return (
      <div className="container">
        <div className="empty">
          <div className="icon">🧭</div>
          <h3>{error}</h3>
          <Link to="/communities" className="btn btn-primary">返回社区列表</Link>
        </div>
      </div>
    );
  }

  const typeMeta = COMMUNITY_TYPE_META[community.type] || COMMUNITY_TYPE_META.general;

  return (
    <div className="container">
      <div className="breadcrumb">
        <Link to="/">首页</Link> / <Link to="/communities">社区</Link> / <span>{community.name}</span>
      </div>

      <div className="card community-hero">
        <span className="community-avatar" style={{ background: community.color }}>{community.name.slice(0, 1)}</span>
        <div className="community-hero-info">
          <h1>{community.name}</h1>
          <p>{community.description}</p>
          <div className="community-hero-meta">
            <span className="chip chip-soft" style={{ background: '#f2f4f3', color: community.color }}>{typeMeta.label}</span>
            <span className="meta-item"><UsersIcon width={13} height={13} />{community.memberCount} 成员</span>
            <span className="meta-item"><FileIcon width={13} height={13} />{posts.length} 帖子</span>
            <span>创建者：{community.owner?.username || '用户'}</span>
          </div>
        </div>
        <button className={`btn ${community.joined ? 'btn-ghost' : 'btn-primary'}`} onClick={join}>
          {community.joined ? '已加入 ✓' : '+ 加入社区'}
        </button>
      </div>

      <div className="section">
        <div className="section-head">
          <h2>社区帖子</h2>
          <button className="btn btn-primary btn-sm" onClick={() => { setError(''); setShowForm(!showForm); }}>
            <PlusIcon width={14} height={14} /> 发布帖子
          </button>
        </div>

        {error && !showForm && <div className="form-error">{error}</div>}

        {showForm && (
          <form className="card" style={{ marginBottom: 20 }} onSubmit={createPost}>
            <h3 style={{ fontFamily: 'var(--serif)', marginBottom: 16 }}>发布新帖子</h3>
            {error && <div className="form-error">{error}</div>}
            <div className="field">
              <label>帖子类型<span className="req">*</span></label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {POST_TYPES.map((t) => (
                  <option key={t.key} value={t.key}>{t.icon} {t.label}</option>
                ))}
              </select>
              <div className="field-hint">
                招募队友 / 招募成员类帖子会自动汇总到「招募组队」广场
              </div>
            </div>
            <div className="field">
              <label>标题<span className="req">*</span></label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="一句话说明你的来意，如：iGEM 2026 队伍招募实验组队友"
                maxLength={80}
                required
              />
            </div>
            <div className="field">
              <label>内容<span className="req">*</span></label>
              <textarea
                rows={7}
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="详细介绍你的计划、招募要求、联系方式等，段落之间用空行分隔…"
                required
              />
            </div>
            <div className="field">
              <label>标签（用逗号或空格分隔）</label>
              <input
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                placeholder="如：iGEM, 组队, 合成生物学"
              />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>取消</button>
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy ? '发布中…' : '发布帖子'}
              </button>
            </div>
          </form>
        )}

        {posts.length === 0 ? (
          <div className="empty">
            <div className="icon">💬</div>
            <h3>还没有帖子</h3>
            <p>成为第一个发帖的人吧！</p>
          </div>
        ) : (
          <div className="grid-2">
            {posts.map((p) => (
              <PostCard key={p.id} post={p} showCommunity={false} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
