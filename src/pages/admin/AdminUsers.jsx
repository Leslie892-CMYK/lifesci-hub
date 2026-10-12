import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { useAuth } from '../../auth.jsx';
import { fmtDate } from '../../utils.js';

const ROLE_LABELS = {
  user: '用户',
  editor: '编辑',
  admin: '管理员'
};

export default function AdminUsers() {
  const { user: me } = useAuth();
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = () => {
    api
      .adminUsers()
      .then((d) => setItems(d.items))
      .catch((e) => setError(e.message));
  };

  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  const changeRole = async (u, role) => {
    setBusyId(u.id);
    setError('');
    try {
      await api.setUserRole(u.id, role);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const del = async (u) => {
    if (!window.confirm(`确定删除用户「${u.username}」吗？其发布的帖子、评论、点赞与社区关系都会被清除，且不可恢复。`)) return;
    try {
      await api.deleteUser(u.id);
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div>
      {error && <div className="form-error">{error}</div>}
      <div className="table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th><th>用户</th><th>角色</th><th>简介</th><th>帖子</th><th>评论</th><th>注册</th><th>操作</th>
            </tr>
          </thead>
          <tbody>
            {items.map((u) => {
              const isSelf = u.id === me.id;
              return (
                <tr key={u.id}>
                  <td>{u.id}</td>
                  <td>
                    <span className="author-chip">
                      <span className="avatar avatar-sm" style={{ background: u.color }}>
                        {u.username.slice(0, 1).toUpperCase()}
                      </span>
                      {u.username}
                      {isSelf && <span className="nav-role">自己</span>}
                    </span>
                  </td>
                  <td>
                    <select
                      className="role-select"
                      value={u.role}
                      disabled={isSelf || busyId === u.id}
                      onChange={(e) => changeRole(u, e.target.value)}
                    >
                      {Object.entries(ROLE_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <span className="cell-title" style={{ fontWeight: 400, maxWidth: 220 }}>
                      {u.bio || '—'}
                    </span>
                  </td>
                  <td>{u.posts}</td>
                  <td>{u.comments}</td>
                  <td>{fmtDate(u.createdAt)}</td>
                  <td>
                    <div className="admin-actions">
                      <button className="btn btn-outline btn-sm danger" disabled={isSelf} onClick={() => del(u)}>
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="field-hint" style={{ marginTop: 10 }}>
        角色说明：用户（可发帖评论、提交工具）· 编辑（可发布/编辑文章）· 管理员（拥有全部权限）。不能修改自己的角色，系统始终保留至少一名管理员。
      </p>
    </div>
  );
}
