import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api.js';
import { SearchIcon } from '../../components/Icons.jsx';
import { CATEGORY_META, fmtDate } from '../../utils.js';

export default function AdminArticles() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState('');
  const [error, setError] = useState('');

  const load = (query = '') => {
    api
      .articles({ size: 100, q: query })
      .then((d) => setItems(d.items))
      .catch((e) => setError(e.message));
  };

  useEffect(() => {
    load();
  }, []);

  const del = async (a) => {
    if (!window.confirm(`确定删除文章《${a.title}》吗？相关评论会一并删除，且不可恢复。`)) return;
    try {
      await api.deleteArticle(a.id);
      load(q);
    } catch (e) {
      window.alert(e.message);
    }
  };

  return (
    <div>
      {error && <div className="form-error">{error}</div>}
      <form
        className="filter-row"
        style={{ marginBottom: 14 }}
        onSubmit={(e) => {
          e.preventDefault();
          load(q.trim());
        }}
      >
        <div className="search-box">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="按标题 / 标签搜索文章…" />
          <button type="submit" aria-label="搜索"><SearchIcon width={16} height={16} /></button>
        </div>
        <Link to="/publish" className="btn btn-primary btn-sm">+ 发布新文章</Link>
      </form>

      <div className="table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th><th>标题</th><th>栏目</th><th>期刊</th><th>发布人</th><th>发布</th><th>阅读</th><th>操作</th>
            </tr>
          </thead>
          <tbody>
            {items.map((a) => (
              <tr key={a.id}>
                <td>{a.id}</td>
                <td>
                  <Link to={`/articles/${a.id}`} className="cell-title">{a.title}</Link>
                </td>
                <td>{CATEGORY_META[a.category]?.label || a.category}</td>
                <td>{a.journal || '—'}</td>
                <td>{a.author?.username || '—'}</td>
                <td>{fmtDate(a.publishedAt)}</td>
                <td>{a.views}</td>
                <td>
                  <div className="admin-actions">
                    <Link to={`/publish?edit=${a.id}`} className="btn btn-outline btn-sm">编辑</Link>
                    <button className="btn btn-outline btn-sm danger" onClick={() => del(a)}>删除</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && <div className="empty" style={{ padding: 30 }}><p>暂无文章</p></div>}
      </div>
    </div>
  );
}
