import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import {
  COMPETITION_LEVELS,
  COMPETITION_STATUSES,
  COMPETITION_TYPES,
  COMPETITION_NATION_LEVELS
} from '../utils.js';

const EMPTY = {
  title: '',
  type: '学科竞赛',
  catalogLevel: '待认定',
  level: '国家级',
  star: 3,
  organizer: '',
  deadline: '',
  status: '报名中',
  tags: '',
  communityId: '',
  sourceUrl: '',
  intro: '',
  timeline: '',
  submission: '',
  content: ''
};

export default function CompetitionSubmit() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const [form, setForm] = useState(EMPTY);
  const [communities, setCommunities] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const canSubmit = user && (user.role === 'admin' || user.role === 'editor');

  useEffect(() => {
    api.communities().then(setCommunities).catch(() => {});
    if (!editId) return;
    let alive = true;
    api
      .competition(editId)
      .then((d) => {
        if (!alive) return;
        const c = d.competition;
        setForm({
          title: c.title,
          type: c.type,
          catalogLevel: c.catalogLevel,
          level: c.level,
          star: c.star,
          organizer: c.organizer,
          deadline: c.deadline || '',
          status: c.status,
          tags: (c.tags || []).join(', '),
          communityId: c.communityId ? String(c.communityId) : '',
          sourceUrl: c.sourceUrl || '',
          intro: c.intro,
          timeline: (c.timeline || []).map((t) => `${t.label}|${t.date}`).join('\n'),
          submission: c.submission,
          content: c.content
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
          <p>登录后即可发布比赛通知。</p>
          <Link to="/login" className="btn btn-primary">去登录</Link>
        </div>
      </div>
    );
  }

  if (!canSubmit) {
    return (
      <div className="container">
        <div className="empty">
          <div className="icon">🔒</div>
          <h3>仅管理员 / 编辑可以发布比赛通知</h3>
          <p>普通用户可以在比赛详情页评论区交流，或到社区发帖组队。</p>
          <Link to="/competitions" className="btn btn-primary">返回比赛动态</Link>
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
      const payload = { ...form, communityId: form.communityId ? Number(form.communityId) : null };
      const data = editId
        ? await api.updateCompetition(editId, payload)
        : await api.createCompetition(payload);
      navigate(`/competitions/${data.competition.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container">
      <div className="breadcrumb">
        <Link to="/">首页</Link> / <Link to="/competitions">比赛动态</Link> / {editId ? <Link to="/admin?tab=competitions">管理后台</Link> : null} / <span>{editId ? '编辑比赛' : '发布比赛通知'}</span>
      </div>

      <form className="card" style={{ padding: '28px 32px', maxWidth: 780 }} onSubmit={submit}>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 24, marginBottom: 4 }}>{editId ? '编辑比赛信息' : '发布比赛通知'}</h1>
        <p className="form-sub">
          目录等级请依据学校最新认定的《大学生学科竞赛目录》填写；也可由管理员后续在后台修正。
        </p>
        {error && <div className="form-error">{error}</div>}

        <div className="field">
          <label>比赛名称<span className="req">*</span></label>
          <input
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="如：第十一届全国大学生生命科学竞赛（创新创业类）"
            maxLength={120}
            required
          />
        </div>

        <div className="form-row">
          <div className="field">
            <label>类型<span className="req">*</span></label>
            <select value={form.type} onChange={(e) => set('type', e.target.value)}>
              {COMPETITION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="field">
            <label>赛事级别<span className="req">*</span></label>
            <select value={form.level} onChange={(e) => set('level', e.target.value)}>
              {COMPETITION_NATION_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="field">
            <label>学校目录等级（含金量）<span className="req">*</span></label>
            <select value={form.catalogLevel} onChange={(e) => set('catalogLevel', e.target.value)}>
              {COMPETITION_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div className="field">
            <label>推荐指数（1-5 星）</label>
            <select value={form.star} onChange={(e) => set('star', Number(e.target.value))}>
              {[5, 4, 3, 2, 1].map((s) => <option key={s} value={s}>{'★'.repeat(s)}</option>)}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="field">
            <label>状态</label>
            <select value={form.status} onChange={(e) => set('status', e.target.value)}>
              {COMPETITION_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="field">
            <label>报名 / 提交截止日期</label>
            <input
              type="date"
              value={form.deadline}
              onChange={(e) => set('deadline', e.target.value)}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="field">
            <label>主办方</label>
            <input
              value={form.organizer}
              onChange={(e) => set('organizer', e.target.value)}
              placeholder="如：全国大学生生命科学竞赛委员会"
              maxLength={120}
            />
          </div>
          <div className="field">
            <label>关联社区（用于组队交流）</label>
            <select value={form.communityId} onChange={(e) => set('communityId', e.target.value)}>
              <option value="">不关联</option>
              {communities.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="field">
            <label>学校官网通知链接（选填）</label>
            <input
              value={form.sourceUrl}
              onChange={(e) => set('sourceUrl', e.target.value)}
              placeholder="https://cxcy.hmc.edu.cn/..."
            />
          </div>
          <div className="field">
            <label>标签（逗号分隔）</label>
            <input
              value={form.tags}
              onChange={(e) => set('tags', e.target.value)}
              placeholder="如：生命科学, A类竞赛"
            />
          </div>
        </div>

        <div className="field">
          <label>比赛介绍<span className="req">*</span></label>
          <textarea
            rows={3}
            value={form.intro}
            onChange={(e) => set('intro', e.target.value)}
            placeholder="比赛背景、面向对象与学校参赛安排…"
            required
          />
        </div>

        <div className="field">
          <label>时间安排（每行一条：阶段|日期）</label>
          <textarea
            rows={4}
            value={form.timeline}
            onChange={(e) => set('timeline', e.target.value)}
            placeholder={'网上申报|2026-04-20\n资格审查|2026-04-21\n省赛|2026-06'}
          />
        </div>

        <div className="field">
          <label>提交作品内容</label>
          <textarea
            rows={3}
            value={form.submission}
            onChange={(e) => set('submission', e.target.value)}
            placeholder="需要提交什么作品 / 材料（商业计划书、论文、视频等）…"
          />
        </div>

        <div className="field">
          <label>详情与通知原文</label>
          <textarea
            rows={6}
            value={form.content}
            onChange={(e) => set('content', e.target.value)}
            placeholder="详细通知内容，段落之间用空行分隔…"
          />
        </div>

        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? '保存中…' : editId ? '保存修改' : '发布'}
        </button>
      </form>
    </div>
  );
}
