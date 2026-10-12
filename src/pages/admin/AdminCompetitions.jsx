import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api.js';
import { COMPETITION_LEVEL_COLORS, COMPETITION_STATUS_COLORS, fmtDate } from '../../utils.js';

export default function AdminCompetitions() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');

  const load = () => {
    api
      .competitions({ size: 100 })
      .then((d) => setItems(d.items))
      .catch((e) => setError(e.message));
  };

  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  const del = async (c) => {
    if (!window.confirm(`确定删除比赛「${c.title}」吗？该操作不可恢复。`)) return;
    try {
      await api.deleteCompetition(c.id);
      load();
    } catch (e) {
      window.alert(e.message);
    }
  };

  return (
    <div>
      {error && <div className="form-error">{error}</div>}
      <div style={{ marginBottom: 14 }}>
        <Link to="/competitions/submit" className="btn btn-primary btn-sm">+ 发布比赛通知</Link>
        <span className="field-hint" style={{ marginLeft: 10 }}>
          标记「官网同步」的条目由学校创新创业学院官网自动抓取，目录等级默认为「待认定」，请人工核定后修改。
        </span>
      </div>
      <div className="table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th><th>比赛</th><th>目录等级</th><th>状态</th><th>来源</th><th>截止</th><th>浏览</th><th>操作</th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id}>
                <td>{c.id}</td>
                <td>
                  <Link to={`/competitions/${c.id}`} className="cell-title">{c.title}</Link>
                </td>
                <td>
                  <span className="comp-level" style={{ background: COMPETITION_LEVEL_COLORS[c.catalogLevel] || '#94a3b8' }}>
                    {c.catalogLevel}
                  </span>
                </td>
                <td>
                  <span style={{ color: COMPETITION_STATUS_COLORS[c.status] || '#64748b', fontWeight: 600 }}>{c.status}</span>
                </td>
                <td>{c.source === '官网同步' ? '官网同步' : '编辑发布'}</td>
                <td>{c.deadline ? fmtDate(c.deadline) : '—'}</td>
                <td>{c.views}</td>
                <td>
                  <div className="admin-actions">
                    <Link to={`/competitions/${c.id}`} className="btn btn-outline btn-sm">查看</Link>
                    <Link to={`/competitions/submit?edit=${c.id}`} className="btn btn-outline btn-sm">编辑</Link>
                    <button className="btn btn-outline btn-sm danger" onClick={() => del(c)}>删除</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && <div className="empty" style={{ padding: 30 }}><p>暂无比赛信息</p></div>}
      </div>
    </div>
  );
}
