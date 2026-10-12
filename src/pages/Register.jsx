import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { api } from '../api.js';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '', confirm: '', bio: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [publicMode, setPublicMode] = useState(false);

  useEffect(() => {
    api
      .stats()
      .then((s) => setPublicMode(!!s.publicMode))
      .catch(() => {});
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      setError('两次输入的密码不一致');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await register({ username: form.username.trim(), password: form.password, bio: form.bio });
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container">
      <div className="card form-card">
        <h1>创建账号 🧬</h1>
        <p className="form-sub">加入生命科学前沿社区，与科研同路人一起成长。</p>
        {publicMode && (
          <div className="demo-accounts" style={{ marginTop: 0, marginBottom: 18 }}>
            <b>🔒 公开部署模式</b>
            <p style={{ margin: '8px 0 0', lineHeight: 1.7 }}>
              当前站点还没有任何账号 —— 你注册的第一个账号将自动成为<b>站点管理员</b>，请使用强密码并妥善保管。
            </p>
          </div>
        )}
        {error && <div className="form-error">{error}</div>}
        <form onSubmit={submit}>
          <div className="field">
            <label>用户名<span className="req">*</span></label>
            <input
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="2-20 个字符"
              maxLength={20}
              autoComplete="username"
              required
            />
          </div>
          <div className="form-row">
            <div className="field">
              <label>密码<span className="req">*</span></label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="至少 6 位"
                autoComplete="new-password"
                required
              />
            </div>
            <div className="field">
              <label>确认密码<span className="req">*</span></label>
              <input
                type="password"
                value={form.confirm}
                onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                placeholder="再次输入密码"
                autoComplete="new-password"
                required
              />
            </div>
          </div>
          <div className="field">
            <label>个人简介（选填）</label>
            <input
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              placeholder="如：生物科学大二，会 Python，想找生信队友"
              maxLength={120}
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? '注册中…' : '注册'}
          </button>
        </form>
        <div className="form-foot">
          已有账号？<Link to="/login">去登录</Link>
        </div>
      </div>
    </div>
  );
}
