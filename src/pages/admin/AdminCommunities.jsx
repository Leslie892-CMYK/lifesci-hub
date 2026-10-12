import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api.js';
import { COMMUNITY_COLORS, COMMUNITY_TYPES, COMMUNITY_TYPE_META } from '../../utils.js';

const EMPTY = { name: '', description: '', type: 'general', color: COMMUNITY_COLORS[0] };

export default function AdminCommunities() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);

  const load = () => {
    api
      .communities()
      .then(setItems)
      .catch((e) => setError(e.message));
  };

  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  const openEdit = (c) => {
    setEditing(c);
    setForm({ name: c.name, description: c.description, type: c.type, color: c.color });
  };

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.updateCommunity(editing.id, form);
      setEditing(null);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const del = async (c) => {
    if (!window.confirm(`确定删除社区「${c.name}」吗？其中的 ${c.posts} 篇帖子与相关评论会一并删除，且不可恢复。`)) return;
    try {
      await api.deleteCommunity(c.id);
      load();
    } catch (e) {
      window.alert(e.message);
    }
  };

  return (
    <div>
      {error && !editing && <div className="form-error">{error}</div>}
      <div className="table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th><th>社区</th><th>类型</th><th>成员</th><th>帖子</th><th>创建者</th><th>操作</th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id}>
                <td>{c.id}</td>
                <td>
                  <Link to={`/communities/${c.slug}`} className="cell-title">
                    <span className="community-dot" style={{ background: c.color }} /> {c.name}
                  </Link>
                </td>
                <td>{COMMUNITY_TYPE_META[c.type]?.label || c.type}</td>
                <td>{c.members}</td>
                <td>{c.posts}</td>
                <td>{c.ownerName}</td>
                <td>
                  <div className="admin-actions">
                    <button className="btn btn-outline btn-sm" onClick={() => openEdit(c)}>编辑</button>
                    <button className="btn btn-outline btn-sm danger" onClick={() => del(c)}>删除</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="modal-overlay" onClick={() => setEditing(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>编辑社区「{editing.name}」</h2>
            {error && <div className="form-error">{error}</div>}
            <form onSubmit={save}>
              <div className="field">
                <label>社区名称<span className="req">*</span></label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  maxLength={30}
                  required
                />
                <div className="field-hint">英文标识（访问链接）不可修改</div>
              </div>
              <div className="field">
                <label>社区简介</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
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
                  {COMMUNITY_COLORS.map((col) => (
                    <span
                      key={col}
                      className={`swatch ${form.color === col ? 'selected' : ''}`}
                      style={{ background: col }}
                      onClick={() => setForm({ ...form, color: col })}
                    />
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)}>取消</button>
                <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? '保存中…' : '保存修改'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
