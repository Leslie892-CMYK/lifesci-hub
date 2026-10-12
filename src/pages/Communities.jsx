import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import CommunityCard from '../components/CommunityCard.jsx';
import { PlusIcon } from '../components/Icons.jsx';
import { COMMUNITY_COLORS, COMMUNITY_TYPES } from '../utils.js';

const EMPTY_FORM = { name: '', slug: '', description: '', type: 'general', color: COMMUNITY_COLORS[0] };

export default function Communities() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    api
      .communities()
      .then(setCommunities)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const join = async (c) => {
    if (!user) return navigate('/login');
    setBusyId(c.id);
    try {
      const data = await api.joinCommunity(c.id);
      setCommunities((list) =>
        list.map((x) => (x.id === c.id ? { ...x, joined: data.joined, members: data.memberCount } : x))
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const create = async (e) => {
    e.preventDefault();
    if (!user) return navigate('/login');
    setBusy(true);
    setError('');
    try {
      const c = await api.createCommunity(form);
      setShowForm(false);
      setForm(EMPTY_FORM);
      navigate(`/communities/${c.slug}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container">
      <div className="recruit-head card">
        <h1>科研社区</h1>
        <p>
          加入感兴趣的社区参与讨论；也可以创建自己的社区 —— 招募竞赛队友、科研团队成员，或建立领域交流圈。
        </p>
        <div style={{ marginTop: 14 }}>
          <button className="btn btn-primary" onClick={() => { setError(''); setShowForm(true); }}>
            <PlusIcon width={15} height={15} /> 创建社区
          </button>
        </div>
      </div>

      {error && !showForm && <div className="form-error" style={{ marginTop: 14 }}>{error}</div>}

      {loading ? (
        <div className="loading">加载中…</div>
      ) : (
        <div className="grid-3" style={{ marginTop: 22 }}>
          {communities.map((c) => (
            <CommunityCard key={c.id} community={c} onJoin={join} busy={busyId === c.id} />
          ))}
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>创建社区</h2>
            {error && <div className="form-error">{error}</div>}
            <form onSubmit={create}>
              <div className="field">
                <label>社区名称<span className="req">*</span></label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="如：iGEM 竞赛组队"
                  maxLength={30}
                  required
                />
              </div>
              <div className="field">
                <label>英文标识（用于访问链接）<span className="req">*</span></label>
                <input
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                  placeholder="如：igem"
                  maxLength={40}
                  required
                />
                <div className="field-hint">仅小写字母、数字与连字符，2-40 位</div>
              </div>
              <div className="field">
                <label>社区简介</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="一句话介绍这个社区是做什么的…"
                  maxLength={200}
                />
              </div>
              <div className="field">
                <label>社区类型<span className="req">*</span></label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  {COMMUNITY_TYPES.map((t) => (
                    <option key={t.key} value={t.key}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>主题色</label>
                <div className="swatches">
                  {COMMUNITY_COLORS.map((c) => (
                    <span
                      key={c}
                      className={`swatch ${form.color === c ? 'selected' : ''}`}
                      style={{ background: c }}
                      onClick={() => setForm({ ...form, color: c })}
                    />
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>取消</button>
                <button type="submit" className="btn btn-primary" disabled={busy}>
                  {busy ? '创建中…' : '创建社区'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
