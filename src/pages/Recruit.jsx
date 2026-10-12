import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import PostCard from '../components/PostCard.jsx';

const TABS = [
  { key: '', label: '全部招募' },
  { key: 'recruit_teammate', label: '🤝 招募队友' },
  { key: 'recruit_member', label: '🧑‍🔬 招募成员' }
];

export default function Recruit() {
  const [type, setType] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .recruit({ type })
      .then((d) => setItems(d.items))
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, [type]);

  return (
    <div className="container">
      <div className="recruit-head card">
        <h1>招募组队广场</h1>
        <p>
          竞赛组队（iGEM / iDEC / 挑战杯 / 大创…）、实验室进组、科研助理招募信息都汇集在这里。
          也可以在下方社区发布自己的招募帖。
        </p>
        <div style={{ marginTop: 16 }} className="tabs">
          {TABS.map((t) => (
            <button key={t.key} className={`tab ${type === t.key ? 'active' : ''}`} onClick={() => setType(t.key)}>
              {t.label}
            </button>
          ))}
          <Link to="/communities/recruitment" className="tab" style={{ background: '#fff7ed', borderColor: '#fdba74', color: '#c2410c' }}>
            ✏️ 发布招募帖
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="loading">加载中…</div>
      ) : items.length === 0 ? (
        <div className="empty">
          <div className="icon">🔭</div>
          <h3>暂无招募信息</h3>
          <p>成为第一个发布招募帖的人吧！</p>
          <Link to="/communities/recruitment" className="btn btn-primary">去发布招募</Link>
        </div>
      ) : (
        <div className="grid-2" style={{ marginTop: 22 }}>
          {items.map((p) => (
            <PostCard key={p.id} post={p} showCommunity />
          ))}
        </div>
      )}
    </div>
  );
}
