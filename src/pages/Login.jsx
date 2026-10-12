import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { api } from '../api.js';

const DEMO_ACCOUNTS = [
  { label: '管理员', username: 'admin', password: 'admin123' },
  { label: '编辑（可发布文章）', username: 'editor', password: 'editor123' },
  { label: '普通用户', username: 'synbio_li', password: '123456' }
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [publicMode, setPublicMode] = useState(false);
  const from = location.state?.from || '/';

  useEffect(() => {
    api
      .stats()
      .then((s) => setPublicMode(!!s.publicMode))
      .catch(() => {});
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(form.username.trim(), form.password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container">
      <div className="card form-card">
        <h1>欢迎回来 👋</h1>
        <p className="form-sub">登录后即可参与讨论、加入社区、发布招募帖。</p>
        {error && <div className="form-error">{error}</div>}
        <form onSubmit={submit}>
          <div className="field">
            <label>用户名</label>
            <input
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="请输入用户名"
              autoComplete="username"
              required
            />
          </div>
          <div className="field">
            <label>密码</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="请输入密码"
              autoComplete="current-password"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? '登录中…' : '登录'}
          </button>
        </form>
        <div className="form-foot">
          还没有账号？<Link to="/register">立即注册</Link>
        </div>

        {publicMode ? (
          <div className="demo-accounts">
            <b>🔒 公开部署模式</b>
            <p style={{ margin: '8px 0 0', lineHeight: 1.7 }}>
              本站点不提供任何演示账号。请点击上方「立即注册」创建第一个账号 ——
              它将被自动设置为站点管理员，注册后即可进入「管理后台」。
            </p>
          </div>
        ) : (
          <div className="demo-accounts">
            <b>开发模式演示账号（仅本地开发可用）</b>
            {DEMO_ACCOUNTS.map((a) => (
              <div className="row" key={a.username}>
                <span>{a.label}：{a.username} / {a.password}</span>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => setForm({ username: a.username, password: a.password })}
                >
                  填充
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
