import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { fmtDate } from '../utils.js';

export default function Account() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ oldPassword: '', newPassword: '', confirm: '' });
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);

  if (!user) {
    return (
      <div className="container">
        <div className="empty">
          <div className="icon">🔒</div>
          <h3>请先登录</h3>
          <p>登录后即可修改密码与查看账号信息。</p>
          <Link to="/login" className="btn btn-primary">去登录</Link>
        </div>
      </div>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setOk('');
    if (form.newPassword !== form.confirm) {
      setError('两次输入的新密码不一致');
      return;
    }
    setBusy(true);
    try {
      await api.changePassword({ oldPassword: form.oldPassword, newPassword: form.newPassword });
      setForm({ oldPassword: '', newPassword: '', confirm: '' });
      setOk('密码修改成功，下次登录请使用新密码。');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container">
      <div className="breadcrumb">
        <Link to="/">首页</Link> / <span>账号设置</span>
      </div>

      <div className="detail-layout">
        <div>
          <div className="card" style={{ padding: '28px 32px' }}>
            <h1 style={{ fontFamily: 'var(--serif)', fontSize: 24, marginBottom: 16 }}>账号信息</h1>
            <div className="admin-list-item">
              <span className="avatar" style={{ background: user.color }}>
                {user.username.slice(0, 1).toUpperCase()}
              </span>
              <span className="title" style={{ fontWeight: 600 }}>{user.username}</span>
              <span className="nav-role">
                {user.role === 'admin' ? '管理员' : user.role === 'editor' ? '编辑' : '普通用户'}
              </span>
              <span className="time">注册于 {fmtDate(user.createdAt)}</span>
            </div>
            {user.bio && <p className="field-hint" style={{ marginTop: 10 }}>简介：{user.bio}</p>}
            <div style={{ marginTop: 18 }}>
              <button
                className="btn btn-outline btn-sm"
                onClick={async () => {
                  await logout();
                  navigate('/');
                }}
              >
                退出登录
              </button>
            </div>
          </div>

          <form className="card" style={{ padding: '28px 32px', marginTop: 20 }} onSubmit={submit}>
            <h1 style={{ fontFamily: 'var(--serif)', fontSize: 24, marginBottom: 4 }}>修改密码</h1>
            <p className="form-sub">修改成功后当前会话保持有效，其他设备需要重新登录。</p>
            {error && <div className="form-error">{error}</div>}
            {ok && <div className="demo-accounts" style={{ borderColor: '#bcd9c9', color: '#0a6b4a' }}>{ok}</div>}

            <div className="field">
              <label>原密码<span className="req">*</span></label>
              <input
                type="password"
                value={form.oldPassword}
                onChange={(e) => setForm({ ...form, oldPassword: e.target.value })}
                autoComplete="current-password"
                required
              />
            </div>
            <div className="form-row">
              <div className="field">
                <label>新密码<span className="req">*</span></label>
                <input
                  type="password"
                  value={form.newPassword}
                  onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                  placeholder="至少 6 位"
                  autoComplete="new-password"
                  required
                />
              </div>
              <div className="field">
                <label>确认新密码<span className="req">*</span></label>
                <input
                  type="password"
                  value={form.confirm}
                  onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                  autoComplete="new-password"
                  required
                />
              </div>
            </div>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? '提交中…' : '确认修改'}
            </button>
          </form>
        </div>

        <aside className="detail-side">
          <div className="card aside-card">
            <div className="aside-title">🛡️ 安全提示</div>
            <p className="field-hint" style={{ margin: 0 }}>
              1. 密码使用 scrypt 加盐哈希存储，任何人均无法查看明文；<br />
              2. 登录会话 7 天后自动失效，请定期重新登录；<br />
              3. 公开使用时请务必使用强密码，不要与校内统一身份认证共用密码。
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
