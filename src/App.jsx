import { useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Home from './pages/Home.jsx';
import Articles from './pages/Articles.jsx';
import ArticleDetail from './pages/ArticleDetail.jsx';
import Communities from './pages/Communities.jsx';
import CommunityDetail from './pages/CommunityDetail.jsx';
import PostDetail from './pages/PostDetail.jsx';
import Recruit from './pages/Recruit.jsx';
import Frontier from './pages/Frontier.jsx';
import Ophthalmology from './pages/Ophthalmology.jsx';
import OpenMedAI from './pages/OpenMedAI.jsx';
import OmTopicDetail from './pages/OmTopicDetail.jsx';
import Competitions from './pages/Competitions.jsx';
import CompetitionDetail from './pages/CompetitionDetail.jsx';
import CompetitionSubmit from './pages/CompetitionSubmit.jsx';
import Repo from './pages/Repo.jsx';
import RepoDetail from './pages/RepoDetail.jsx';
import RepoSubmit from './pages/RepoSubmit.jsx';
import Admin from './pages/Admin.jsx';
import Publish from './pages/Publish.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Account from './pages/Account.jsx';

function ScrollToTop() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname, search]);
  return null;
}

function NotFound() {
  return (
    <div className="container">
      <div className="empty">
        <div className="icon">🧬</div>
        <h3>页面走丢了</h3>
        <p>你访问的页面不存在或已被移除。</p>
        <Link to="/" className="btn btn-primary">回到首页</Link>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <div className="app">
      <ScrollToTop />
      <Navbar />
      <main className="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/articles" element={<Articles />} />
          <Route path="/articles/:id" element={<ArticleDetail />} />
          <Route path="/communities" element={<Communities />} />
          <Route path="/communities/:id" element={<CommunityDetail />} />
          <Route path="/posts/:id" element={<PostDetail />} />
          <Route path="/recruit" element={<Recruit />} />
          <Route path="/frontier" element={<Frontier />} />
          <Route path="/ophthalmology" element={<Ophthalmology />} />
          <Route path="/openmedai" element={<OpenMedAI />} />
          <Route path="/openmedai/topic/:id" element={<OmTopicDetail />} />
          <Route path="/competitions" element={<Competitions />} />
          <Route path="/competitions/submit" element={<CompetitionSubmit />} />
          <Route path="/competitions/:id" element={<CompetitionDetail />} />
          <Route path="/repo" element={<Repo />} />
          <Route path="/repo/submit" element={<RepoSubmit />} />
          <Route path="/repo/:id" element={<RepoDetail />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/publish" element={<Publish />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/account" element={<Account />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <footer className="footer">
        <div className="footer-inner">
          <div>
            <div className="footer-brand">
              <span className="brand-logo">🧬</span> 生命科学前沿 · LifeSciHub
            </div>
            <p className="footer-desc">
              每日精选生命科学领域顶刊文章与新兴技术资讯，连接科研同路人 —— 讨论、组队、招募，一起做科研。
            </p>
          </div>
          <div className="footer-links">
            <Link to="/articles">顶刊动态</Link>
            <Link to="/articles?category=tech">新兴技术</Link>
            <Link to="/frontier">学术前沿</Link>
            <Link to="/competitions">比赛动态</Link>
            <Link to="/communities">社区</Link>
            <Link to="/recruit">招募组队</Link>
            <Link to="/repo">精选仓库</Link>
            <Link to="/openmedai">OpenMedAI</Link>
            <span>© {new Date().getFullYear()} LifeSciHub · 演示数据仅供学习交流</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
