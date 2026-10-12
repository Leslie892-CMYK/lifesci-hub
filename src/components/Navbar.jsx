import { useState } from 'react';
import { Link, useLocation, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { LogoutIcon, PlusIcon } from './Icons.jsx';

const LINKS = [
  { to: '/', label: '首页' },
  { to: '/articles', label: '顶刊动态' },
  { to: '/articles?category=tech', label: '新兴技术' },
  { to: '/frontier', label: '学术前沿' },
  { to: '/competitions', label: '比赛动态' },
  { to: '/repo', label: '精选仓库' },
  { to: '/openmedai', label: 'OpenMedAI' },
  { to: '/communities', label: '社区' },
  { to: '/recruit', label: '招募组队' }
];

// 高亮匹配：路径 + 查询参数一起判断，避免「顶刊动态」和「新兴技术」同时变绿
function isActive(pathname, searchParams, to) {
  const [path, qs] = to.split('?');
  const matchesPath = pathname === path || (path !== '/' && pathname.startsWith(path + '/'));
  if (qs) {
    const target = new URLSearchParams(qs);
    for (const [k, v] of target) {
      if (searchParams.get(k) !== v) return false;
    }
    return matchesPath;
  }
  // 无查询参数的链接：顶刊动态在「新兴技术」标签下不算激活
  if (path === '/articles' && searchParams.get('category') === 'tech') return false;
  return matchesPath;
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const canPublish = user && (user.role === 'admin' || user.role === 'editor');

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const linkClass = (to) => (isActive(location.pathname, searchParams, to) ? 'active' : '');

  return (
    <header className="navbar">
      <div className="container nav-inner">
        <Link to="/" className="brand">
          <span className="brand-logo">🧬</span>
          <span>
            <span className="brand-name">生命科学前沿</span>
            <span className="brand-tag">LIFESCIHUB</span>
          </span>
        </Link>

        <nav className="nav-links">
          {LINKS.map((l) => (
            <Link key={l.to} to={l.to} className={linkClass(l.to)}>
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="nav-actions">
          {user?.role === 'admin' && (
            <Link to="/admin" className="btn btn-outline btn-sm">管理后台</Link>
          )}
          {canPublish && (
            <Link to="/publish" className="btn btn-primary btn-sm">
              <PlusIcon width={14} height={14} /> 发布文章
            </Link>
          )}
          {user ? (
            <span className="nav-user">
              <span className="avatar avatar-sm" style={{ background: user.color }}>
                {user.username.slice(0, 1).toUpperCase()}
              </span>
              <Link to="/account" className="user-name" title="账号设置">{user.username}</Link>
              {user.role !== 'user' && <span className="nav-role">{user.role === 'admin' ? '管理员' : '编辑'}</span>}
              <button className="btn btn-ghost btn-sm" title="退出登录" onClick={handleLogout}>
                <LogoutIcon width={15} height={15} />
              </button>
            </span>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost btn-sm">登录</Link>
              <Link to="/register" className="btn btn-primary btn-sm">注册</Link>
            </>
          )}
          <button className="hamburger" onClick={() => setOpen(!open)} aria-label="菜单">
            {open ? '✕' : '☰'}
          </button>
        </div>
      </div>

      <nav className={`nav-mobile ${open ? 'open' : ''}`}>
        {LINKS.map((l) => (
          <Link key={l.to} to={l.to} className={linkClass(l.to)} onClick={() => setOpen(false)}>
            {l.label}
          </Link>
        ))}
        {user?.role === 'admin' && (
          <Link to="/admin" className={linkClass('/admin')} onClick={() => setOpen(false)}>管理后台</Link>
        )}
      </nav>
    </header>
  );
}
