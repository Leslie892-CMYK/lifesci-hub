import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api.js';
import { timeAgo } from '../../utils.js';

export default function AdminComments() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');

  const load = () => {
    api
      .adminComments()
      .then((d) => setItems(d.items))
      .catch((e) => setError(e.message));
  };

  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  const del = async (c) => {
    if (!window.confirm('确定删除这条评论吗？其回复也会一并删除。')) return;
    try {
      await api.deleteComment(c.id);
      load();
    } catch (e) {
      window.alert(e.message);
    }
  };

  const targetHref = (c) => (c.targetType === 'article' ? `/articles/${c.targetId}` : `/posts/${c.targetId}`);

  return (
    <div>
      {error && <div className="form-error">{error}</div>}
      <div className="table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th><th>评论人</th><th>内容</th><th>所在内容</th><th>时间</th><th>操作</th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id}>
                <td>{c.id}</td>
                <td>
                  <span className="author-chip">
                    <span className="avatar avatar-sm" style={{ background: c.author?.color || '#0f8a5f' }}>
                      {(c.author?.username || '?').slice(0, 1).toUpperCase()}
                    </span>
                    {c.author?.username || '已注销'}
                  </span>
                </td>
                <td>
                  <span className="cell-title" style={{ fontWeight: 400, maxWidth: 320 }}>
                    {c.content.length > 60 ? `${c.content.slice(0, 60)}…` : c.content}
                  </span>
                </td>
                <td>
                  <Link to={targetHref(c)} className="cell-title" style={{ maxWidth: 240 }}>
                    {c.targetTitle}
                  </Link>
                </td>
                <td>{timeAgo(c.createdAt)}</td>
                <td>
                  <div className="admin-actions">
                    <button className="btn btn-outline btn-sm danger" onClick={() => del(c)}>删除</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && <div className="empty" style={{ padding: 30 }}><p>暂无评论</p></div>}
      </div>
    </div>
  );
}
