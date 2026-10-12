import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import ArticleCard from '../components/ArticleCard.jsx';
import RepoCard from '../components/RepoCard.jsx';
import CompCard from '../components/CompCard.jsx';
import { SearchIcon } from '../components/Icons.jsx';
import { JOURNALS, JOURNAL_COLORS, POST_TYPE_COLORS, POST_TYPE_META } from '../utils.js';

export default function Home() {
  const navigate = useNavigate();
  const [data, setData] = useState({ articles: [], communities: [], recruit: [], repo: [], competitions: [], stats: null });
  const [q, setQ] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [articlesRes, communitiesRes, recruitRes, repoRes, compRes, statsRes] = await Promise.all([
          api.articles({}),
          api.communities(),
          api.recruit({}),
          api.repo({}),
          api.competitions({}),
          api.stats()
        ]);
        if (alive) {
          setData({
            articles: articlesRes.items,
            communities: communitiesRes,
            recruit: recruitRes.items,
            repo: repoRes.items,
            competitions: compRes.items,
            stats: statsRes
          });
        }
      } catch (e) {
        console.error(e);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const { articles, communities, recruit, repo, competitions, stats } = data;
  const todayStr = new Date().toDateString();
  const today = articles.filter((a) => new Date(a.publishedAt).toDateString() === todayStr);
  const fresh = today.length >= 4 ? today.slice(0, 4) : articles.slice(0, 4);
  const journalArts = articles.filter((a) => a.category === 'journal').slice(0, 6);
  const techArts = articles.filter((a) => a.category === 'tech').slice(0, 3);

  const onSearch = (e) => {
    e.preventDefault();
    navigate(`/articles?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <div>
      <section className="hero">
        <div className="hero-inner">
          <span className="hero-badge">🔬 每日更新 · 生命科学领域顶刊与前沿技术</span>
          <h1 className="hero-title">追踪生命科学前沿，连接每一位科研同路人</h1>
          <p className="hero-sub">
            每日精选 Nature / Science / Cell 等顶刊重磅文章与新兴技术解读；
            加入社区与志同道合的人讨论、组队、招募，一起做科研。
          </p>
          <form className="hero-search" onSubmit={onSearch}>
            <input
              type="text"
              placeholder="搜索文章、技术、话题…（如：AlphaFold、单细胞、iGEM）"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <button type="submit"><SearchIcon width={16} height={16} />搜索</button>
          </form>
          {stats && (
            <div className="hero-stats">
              <div className="stat-item"><span className="stat-num">{stats.todayCount}</span><span className="stat-label">今日更新</span></div>
              <div className="stat-item"><span className="stat-num">{stats.articles}</span><span className="stat-label">篇资讯文章</span></div>
              <div className="stat-item"><span className="stat-num">{stats.communities}</span><span className="stat-label">个科研社区</span></div>
              <div className="stat-item"><span className="stat-num">{stats.repo}</span><span className="stat-label">件精选科研工具</span></div>
              <div className="stat-item"><span className="stat-num">{stats.competitions}</span><span className="stat-label">条比赛通知</span></div>
              <div className="stat-item"><span className="stat-num">{stats.users}</span><span className="stat-label">位注册用户</span></div>
            </div>
          )}
        </div>
      </section>

      <div className="container">
        <section className="section">
          <div className="section-head">
            <h2>今日速递</h2>
            <Link to="/articles" className="link-more">查看全部文章 →</Link>
          </div>
          <div className="grid-4">
            {fresh.map((a) => <ArticleCard key={a.id} article={a} />)}
          </div>
        </section>

        <div className="home-columns">
          <div className="home-main">
            <section className="section" style={{ marginTop: 0 }}>
              <div className="section-head">
                <h2>顶刊精选</h2>
                <Link to="/articles?category=journal" className="link-more">更多顶刊文章 →</Link>
              </div>
              <div className="journal-row">
                {JOURNALS.slice(0, 9).map((j) => (
                  <Link key={j} to={`/articles?journal=${encodeURIComponent(j)}`} className="journal-pill" style={{ color: JOURNAL_COLORS[j] }}>
                    {j}
                  </Link>
                ))}
              </div>
              <div className="grid-3">
                {journalArts.map((a) => <ArticleCard key={a.id} article={a} />)}
              </div>
            </section>
          </div>

          <aside className="home-aside">
            <div className="card aside-card">
              <div className="aside-title">🤝 招募速览</div>
              {recruit.slice(0, 5).map((p) => {
                const meta = POST_TYPE_META[p.type] || POST_TYPE_META.discussion;
                return (
                  <Link key={p.id} to={`/posts/${p.id}`} className="aside-item">
                    <span className="aside-item-type" style={{ color: POST_TYPE_COLORS[p.type] }}>
                      {meta.icon} {meta.label}
                    </span>
                    <span className="aside-item-title">{p.title}</span>
                  </Link>
                );
              })}
              <Link to="/recruit" className="link-more aside-more">进入招募组队广场 →</Link>
            </div>

            <div className="card aside-card">
              <div className="aside-title">🔥 热门社区</div>
              {communities.slice(0, 6).map((c) => (
                <Link key={c.id} to={`/communities/${c.slug || c.id}`} className="aside-item">
                  <span className="community-dot" style={{ background: c.color }} />
                  <span className="aside-item-title">{c.name}</span>
                  <span className="aside-item-meta">{c.members} 人</span>
                </Link>
              ))}
              <Link to="/communities" className="link-more aside-more">浏览全部社区 →</Link>
            </div>
          </aside>
        </div>

        <section className="section">
          <div className="section-head">
            <h2>新兴技术前沿</h2>
            <Link to="/articles?category=tech" className="link-more">更多技术解读 →</Link>
          </div>
          <div className="grid-3">
            {techArts.map((a) => <ArticleCard key={a.id} article={a} />)}
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2>🏆 比赛动态</h2>
            <Link to="/competitions" className="link-more">全部比赛通知 →</Link>
          </div>
          <div className="grid-3">
            {competitions.slice(0, 3).map((c) => <CompCard key={c.id} comp={c} />)}
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2>🛠️ 科研工具仓库</h2>
            <Link to="/repo" className="link-more">Skill & MCP 精选 →</Link>
          </div>
          <div className="grid-4">
            {repo.slice(0, 4).map((r) => <RepoCard key={r.id} item={r} />)}
          </div>
        </section>
      </div>
    </div>
  );
}
