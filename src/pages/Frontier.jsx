import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import ArticleCard from '../components/ArticleCard.jsx';
import { FRONTIER_DIRECTIONS } from '../utils.js';

export default function Frontier() {
  const [articles, setArticles] = useState([]);
  const [active, setActive] = useState(FRONTIER_DIRECTIONS[0].key);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .articles({ size: 100 })
      .then((d) => setArticles(d.items || []))
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  const dir = FRONTIER_DIRECTIONS.find((d) => d.key === active) || FRONTIER_DIRECTIONS[0];
  const dirArticles = articles
    .filter((a) => (a.tags || []).some((t) => dir.tags.includes(t)))
    .slice(0, 6);
  const weekly = articles.slice(0, 4);

  return (
    <div className="container">
      <div className="recruit-head card">
        <h1>🧭 学术前沿</h1>
        <p>
          按研究方向聚合的生命科学前沿：顶刊文章、新兴技术解读与热点领域速览，
          内容由站内「顶刊动态」自动汇聚，随每日同步持续更新。
        </p>
      </div>

      <div className="toolbar">
        <div className="tabs">
          {FRONTIER_DIRECTIONS.map((d) => (
            <button
              key={d.key}
              className={`tab ${active === d.key ? 'active' : ''}`}
              onClick={() => setActive(d.key)}
            >
              {d.icon} {d.label}
            </button>
          ))}
        </div>
      </div>

      <section className="section" style={{ marginTop: 8 }}>
        <div className="section-head">
          <h2>{dir.icon} {dir.label}</h2>
          <Link to="/articles" className="link-more">查看全部文章 →</Link>
        </div>
        <p style={{ color: 'var(--muted)', marginBottom: 16, maxWidth: 820 }}>{dir.desc}</p>

        {loading ? (
          <div className="loading">加载中…</div>
        ) : dirArticles.length === 0 ? (
          <div className="empty" style={{ padding: 30 }}>
            <div className="icon">🧪</div>
            <h3>该方向暂无匹配文章</h3>
            <p>可以到「顶刊动态」浏览全部更新，或等待自动同步收录更多。</p>
          </div>
        ) : (
          <div className="grid-3">
            {dirArticles.map((a) => <ArticleCard key={a.id} article={a} />)}
          </div>
        )}
      </section>

      <section className="section">
        <div className="section-head">
          <h2>📌 本周必读</h2>
          <Link to="/articles" className="link-more">更多 →</Link>
        </div>
        <div className="grid-4">
          {weekly.map((a) => <ArticleCard key={a.id} article={a} />)}
        </div>
      </section>
    </div>
  );
}
