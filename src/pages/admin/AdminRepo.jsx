import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api.js';
import { REPO_TYPE_META, REPO_CATEGORY_META } from '../../utils.js';

export default function AdminRepo() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');

  const load = () => {
    api
      .repo({ size: 100 })
      .then((d) => setItems(d.items))
      .catch((e) => setError(e.message));
  };

  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  const del = async (r) => {
    if (!window.confirm(`确定删除精选工具「${r.name}」吗？该操作不可恢复。`)) return;
    try {
      await api.deleteRepo(r.id);
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
              <th>ID</th><th>工具</th><th>类型</th><th>分类</th><th>作者</th><th>⭐</th><th>⬇</th><th>操作</th>
            </tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td>
                  <Link to={`/repo/${r.id}`} className="cell-title">
                    {r.logo} {r.name}
                  </Link>
                </td>
                <td>{REPO_TYPE_META[r.type]?.label || r.type}</td>
                <td>{REPO_CATEGORY_META[r.category]?.label || r.category}</td>
                <td>{r.author}</td>
                <td>{r.stars}</td>
                <td>{r.downloads}</td>
                <td>
                  <div className="admin-actions">
                    <Link to={`/repo/${r.id}`} className="btn btn-outline btn-sm">查看</Link>
                    <Link to={`/repo/submit?edit=${r.id}`} className="btn btn-outline btn-sm">编辑</Link>
                    <button className="btn btn-outline btn-sm danger" onClick={() => del(r)}>删除</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && <div className="empty" style={{ padding: 30 }}><p>暂无工具</p></div>}
      </div>
    </div>
  );
}
