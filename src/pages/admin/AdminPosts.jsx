import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api.js';
import { POST_TYPE_META, fmtDate } from '../../utils.js';

export default function AdminPosts() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');

  const load = () => {
    api
      .adminPosts()
      .then((d) => setItems(d.items))
      .catch((e) => setError(e.message));
  };

  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  const del = async (p) => {
    if (!window.confirm(`确定删除帖子《${p.title}》吗？相关评论会一并删除，且不可恢复。`)) return;
    try {
      await api.deletePost(p.id);
      load();
    } catch (e) {
      window.alert(e.message);
    }
  };

  return (
    <div>
      {error && <div className="form-error">{error}</div>}
      <div className="table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th><th>标题</th><th>类型</th><th>社区</th><th>作者</th><th>发布</th><th>评论</th><th>操作</th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id}>
                <td>{p.id}</td>
                <td>
                  <Link to={`/posts/${p.id}`} className="cell-title">{p.title}</Link>
                </td>
                <td>{POST_TYPE_META[p.type]?.label || p.type}</td>
                <td>{p.community?.name || '—'}</td>
                <td>{p.author?.username || '—'}</td>
                <td>{fmtDate(p.createdAt)}</td>
                <td>{p.comments}</td>
                <td>
                  <div className="admin-actions">
                    <button className="btn btn-outline btn-sm danger" onClick={() => del(p)}>删除</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && <div className="empty" style={{ padding: 30 }}><p>暂无帖子</p></div>}
      </div>
    </div>
  );
}
