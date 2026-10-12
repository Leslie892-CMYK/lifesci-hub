import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import AdminOverview from './admin/AdminOverview.jsx';
import AdminArticles from './admin/AdminArticles.jsx';
import AdminCommunities from './admin/AdminCommunities.jsx';
import AdminPosts from './admin/AdminPosts.jsx';
import AdminComments from './admin/AdminComments.jsx';
import AdminRepo from './admin/AdminRepo.jsx';
import AdminCompetitions from './admin/AdminCompetitions.jsx';
import AdminUsers from './admin/AdminUsers.jsx';

const TABS = [
  { key: 'overview', label: '📊 概览', el: AdminOverview },
  { key: 'articles', label: '📰 文章', el: AdminArticles },
  { key: 'competitions', label: '🏆 比赛', el: AdminCompetitions },
  { key: 'communities', label: '👥 社区', el: AdminCommunities },
  { key: 'posts', label: '💬 帖子', el: AdminPosts },
  { key: 'comments', label: '🗨️ 评论', el: AdminComments },
  { key: 'repo', label: '🧰 仓库', el: AdminRepo },
  { key: 'users', label: '👤 用户', el: AdminUsers }
];

export default function Admin() {
  const { user, ready } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  if (!ready) return <div className="loading">加载中…</div>;

  if (!user) {
    return (
      <div className="container">
        <div className="empty">
          <div className="icon">🔒</div>
          <h3>请先登录</h3>
          <p>管理后台仅对管理员开放。</p>
          <Link to="/login" className="btn btn-primary">去登录</Link>
        </div>
      </div>
    );
  }

  if (user.role !== 'admin') {
    return (
      <div className="container">
        <div className="empty">
          <div className="icon">🚫</div>
          <h3>无访问权限</h3>
          <p>该页面仅管理员可见。编辑账号可以发布文章，普通用户可以参与社区讨论。</p>
          <Link to="/" className="btn btn-primary">返回首页</Link>
        </div>
      </div>
    );
  }

  const tabKey = TABS.some((t) => t.key === searchParams.get('tab')) ? searchParams.get('tab') : 'overview';
  const Active = TABS.find((t) => t.key === tabKey).el;

  return (
    <div className="container">
      <div className="recruit-head card">
        <h1>🛠️ 管理后台</h1>
        <p>
          管理全站内容与用户角色：文章、比赛、社区、帖子、评论、精选仓库、用户。
          所有删除操作均需二次确认，删除内容会级联清理相关评论与点赞。
        </p>
      </div>

      <div className="admin-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`tab ${tabKey === t.key ? 'active' : ''}`}
            onClick={() => setSearchParams({ tab: t.key }, { replace: true })}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Active />
    </div>
  );
}
