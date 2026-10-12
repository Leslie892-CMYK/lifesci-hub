import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { REPO_TYPES, REPO_CATEGORIES } from '../utils.js';

const EMPTY = {
  type: 'mcp',
  name: '',
  author: '',
  category: '文献检索',
  logo: '',
  tags: '',
  downloadUrl: '',
  homepage: '',
  summary: '',
  description: '',
  highlights: '',
  install: '',
  usage: ''
};

export default function RepoSubmit() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!editId) return;
    let alive = true;
    api
      .repoItem(editId)
      .then((d) => {
        if (!alive) return;
        const it = d.item;
        setForm({
          type: it.type,
          name: it.name,
          author: it.author,
          category: it.category,
          logo: it.logo || '',
          tags: (it.tags || []).join(', '),
          downloadUrl: it.downloadUrl,
          homepage: it.homepage || '',
          summary: it.summary,
          description: it.description,
          highlights: (it.highlights || []).join('\n'),
          install: it.install || '',
          usage: it.usage || ''
        });
      })
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [editId]);

  if (!user) {
    return (
      <div className="container">
        <div className="empty">
          <div className="icon">🔒</div>
          <h3>请先登录</h3>
          <p>登录后即可提交你发现的优质科研工具。</p>
          <Link to="/login" className="btn btn-primary">去登录</Link>
        </div>
      </div>
    );
  }

  if (editId && user.role !== 'admin') {
    return (
      <div className="container">
        <div className="empty">
          <div className="icon">🔒</div>
          <h3>仅管理员可以编辑已收录的工具</h3>
          <p>普通用户可以提交新的精选工具。</p>
          <Link to="/repo" className="btn btn-primary">返回工具仓库</Link>
        </div>
      </div>
    );
  }

  const set = (key, value) => setForm({ ...form, [key]: value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const payload = { ...form, author: form.author || user.username };
      const data = editId ? await api.updateRepo(editId, payload) : await api.submitRepo(payload);
      navigate(`/repo/${data.item.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container">
      <div className="breadcrumb">
        <Link to="/">首页</Link> / <Link to="/repo">科研工具仓库</Link> / {editId ? <Link to="/admin?tab=repo">管理后台</Link> : null} / <span>{editId ? '编辑工具' : '提交工具'}</span>
      </div>

      <form className="card" style={{ padding: '28px 32px', maxWidth: 760 }} onSubmit={submit}>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 24, marginBottom: 4 }}>{editId ? '编辑精选工具' : '提交精选工具'}</h1>
        <p className="form-sub">
          {editId
            ? '修改保存后立即生效（仅管理员可用）。'
            : '收录标准：真实可用、适合科研场景、附清晰介绍与可访问的下载地址（GitHub 仓库等）。提交后立即展示在仓库中，管理员会定期复核。'}
        </p>
        {error && <div className="form-error">{error}</div>}

        <div className="form-row">
          <div className="field">
            <label>工具类型<span className="req">*</span></label>
            <select value={form.type} onChange={(e) => set('type', e.target.value)}>
              {REPO_TYPES.map((t) => (
                <option key={t.key} value={t.key}>{t.icon} {t.label}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>分类<span className="req">*</span></label>
            <select value={form.category} onChange={(e) => set('category', e.target.value)}>
              {REPO_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="field">
            <label>工具名称<span className="req">*</span></label>
            <input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="如：arXiv MCP Server"
              maxLength={60}
              required
            />
          </div>
          <div className="field">
            <label>作者 / 组织（选填，默认你的用户名）</label>
            <input
              value={form.author}
              onChange={(e) => set('author', e.target.value)}
              placeholder="如：blazickjp"
              maxLength={40}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="field">
            <label>下载地址（GitHub / 官网）<span className="req">*</span></label>
            <input
              value={form.downloadUrl}
              onChange={(e) => set('downloadUrl', e.target.value)}
              placeholder="https://github.com/..."
              required
            />
          </div>
          <div className="field">
            <label>官方主页（选填）</label>
            <input
              value={form.homepage}
              onChange={(e) => set('homepage', e.target.value)}
              placeholder="https://..."
            />
          </div>
        </div>

        <div className="form-row">
          <div className="field">
            <label>图标 Emoji（选填，默认 🧰）</label>
            <input
              value={form.logo}
              onChange={(e) => set('logo', e.target.value)}
              placeholder="如：📡"
              maxLength={4}
            />
          </div>
          <div className="field">
            <label>标签（用逗号或空格分隔）</label>
            <input
              value={form.tags}
              onChange={(e) => set('tags', e.target.value)}
              placeholder="如：文献检索, arXiv, MCP"
            />
          </div>
        </div>

        <div className="field">
          <label>一句话简介<span className="req">*</span></label>
          <input
            value={form.summary}
            onChange={(e) => set('summary', e.target.value)}
            placeholder="用一句话说明这个工具能帮科研人做什么…"
            maxLength={300}
            required
          />
        </div>

        <div className="field">
          <label>详细介绍<span className="req">*</span></label>
          <textarea
            rows={5}
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="介绍工具的功能、适用场景、在科研中的实际用法…段落之间用空行分隔。"
            required
          />
        </div>

        <div className="field">
          <label>功能亮点（每行一条，最多 10 条）</label>
          <textarea
            rows={4}
            value={form.highlights}
            onChange={(e) => set('highlights', e.target.value)}
            placeholder={'支持 XX 检索\n与 YY 集成\n开箱即用'}
          />
        </div>

        <div className="field">
          <label>安装方式</label>
          <textarea
            rows={3}
            value={form.install}
            onChange={(e) => set('install', e.target.value)}
            placeholder="如：uvx arxiv-mcp-server 或 git clone ..."
          />
        </div>

        <div className="field">
          <label>使用示例</label>
          <textarea
            rows={3}
            value={form.usage}
            onChange={(e) => set('usage', e.target.value)}
            placeholder="如：在 AI 助手中输入「检索最近一周关于 AlphaFold 的预印本」"
          />
        </div>

        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? '保存中…' : editId ? '保存修改' : '提交收录'}
        </button>
      </form>
    </div>
  );
}
