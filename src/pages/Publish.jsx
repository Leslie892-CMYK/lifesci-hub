import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { CATEGORIES, JOURNALS } from '../utils.js';

export default function Publish() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const [form, setForm] = useState({
    title: '',
    category: 'journal',
    journal: 'Nature',
    authors: '',
    doi: '',
    tags: '',
    summary: '',
    content: ''
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const canPublish = user && (user.role === 'admin' || user.role === 'editor');

  useEffect(() => {
    if (!editId || !canPublish) return;
    let alive = true;
    api
      .article(editId)
      .then((d) => {
        if (!alive) return;
        const a = d.article;
        setForm({
          title: a.title,
          category: a.category,
          journal: a.journal || '',
          authors: a.authors || '',
          doi: a.doi || '',
          tags: (a.tags || []).join(', '),
          summary: a.summary,
          content: a.content
        });
      })
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [editId, canPublish]);

  if (!canPublish) {
    return (
      <div className="container">
        <div className="empty">
          <div className="icon">🔒</div>
          <h3>{user ? '仅管理员 / 编辑可以发布文章' : '请先登录'}</h3>
          <p>发布顶刊文章与前沿技术资讯需要编辑权限；普通用户可以在社区发布帖子与招募信息。</p>
          <Link to={user ? '/communities' : '/login'} className="btn btn-primary">
            {user ? '去社区发帖' : '去登录'}
          </Link>
        </div>
      </div>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const payload = {
        ...form,
        journal: form.category === 'journal' ? form.journal : form.journal || ''
      };
      const data = editId ? await api.updateArticle(editId, payload) : await api.publishArticle(payload);
      navigate(`/articles/${data.article.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container">
      <div className="breadcrumb">
        <Link to="/">首页</Link> / {editId ? <Link to="/admin?tab=articles">管理后台</Link> : null} / <span>{editId ? '编辑文章' : '发布文章'}</span>
      </div>
      <form className="card" style={{ padding: '28px 32px', maxWidth: 760 }} onSubmit={submit}>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 24, marginBottom: 4 }}>{editId ? '编辑文章' : '发布资讯文章'}</h1>
        <p className="form-sub">{editId ? '修改保存后立即生效（仅管理员 / 编辑可用）。' : '发布后立即展示在首页与「顶刊动态」列表中（仅管理员 / 编辑可用）。'}</p>
        {error && <div className="form-error">{error}</div>}

        <div className="field">
          <label>文章标题<span className="req">*</span></label>
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="如：单细胞空间多组学揭示肿瘤微环境新机制"
            required
          />
        </div>

        <div className="form-row">
          <div className="field">
            <label>栏目<span className="req">*</span></label>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>来源期刊</label>
            <select value={form.journal} onChange={(e) => setForm({ ...form, journal: e.target.value })}>
              <option value="">无（资讯 / 技术类可留空）</option>
              {JOURNALS.map((j) => (
                <option key={j} value={j}>{j}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="field">
            <label>作者（选填）</label>
            <input
              value={form.authors}
              onChange={(e) => setForm({ ...form, authors: e.target.value })}
              placeholder="如：J. Abramson, et al."
            />
          </div>
          <div className="field">
            <label>DOI（选填）</label>
            <input
              value={form.doi}
              onChange={(e) => setForm({ ...form, doi: e.target.value })}
              placeholder="如：10.1038/s41586-024-07487-w"
            />
          </div>
        </div>

        <div className="field">
          <label>标签（用逗号或空格分隔）</label>
          <input
            value={form.tags}
            onChange={(e) => setForm({ ...form, tags: e.target.value })}
            placeholder="如：结构生物学, 人工智能, 药物发现"
          />
        </div>

        <div className="field">
          <label>摘要<span className="req">*</span></label>
          <textarea
            rows={3}
            value={form.summary}
            onChange={(e) => setForm({ ...form, summary: e.target.value })}
            placeholder="1-3 句话概括文章核心发现…"
            required
          />
        </div>

        <div className="field">
          <label>正文<span className="req">*</span></label>
          <textarea
            rows={12}
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            placeholder={'正文内容。\n\n段落之间用空行分隔，每个段落会自动排版展示。'}
            required
          />
        </div>

        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? '保存中…' : editId ? '保存修改' : '发布文章'}
        </button>
      </form>
    </div>
  );
}
