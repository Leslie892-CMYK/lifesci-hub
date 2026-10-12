import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import {
  OM_DIRECTIONS,
  OM_STATUSES,
  OM_STATUS_COLORS,
  OM_ROLES,
  OM_AUTHORSHIP,
  OM_CLAIM_TYPES,
  OM_SPONSOR_TYPES,
  fmtDate
} from '../utils.js';

const EMPTY_TOPIC = { title: '', direction: OM_DIRECTIONS[0], description: '', deliverables: '', status: '招募中', tags: '' };
const EMPTY_PARTIC = { role: 'AI工程师', authorshipIntent: 'contribution', hoursPerWeek: 5, note: '' };
const EMPTY_CLAIM = { claimType: 'data', note: '' };
const EMPTY_SPONSOR = { sponsorType: 'compute', note: '' };
const FORMS = { participate: EMPTY_PARTIC, claim: EMPTY_CLAIM, sponsor: EMPTY_SPONSOR };

function MyChips({ my }) {
  if (!my) return null;
  const chips = [];
  if (my.participation) chips.push(my.participation.status === 'approved' ? '已加入' : '参与待审核');
  if (my.claim) chips.push(my.claim.status === 'approved' ? '已认领' : '认领待审核');
  if (my.sponsor) chips.push(my.sponsor.status === 'approved' ? '已资助' : '资助待审核');
  if (my.followed) chips.push('已关注');
  if (my.score) chips.push(`已评分 ${my.score} 分`);
  return (
    <span style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap' }}>
      {chips.map((c) => (
        <span key={c} className="tag" style={{ background: '#e6f4ee', color: '#0a6b4a', fontWeight: 700 }}>{c}</span>
      ))}
    </span>
  );
}

export default function OpenMedAI() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [myPoints, setMyPoints] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null); // 'create' | 'participate' | 'claim' | 'sponsor'
  const [target, setTarget] = useState(null);
  const [forms, setForms] = useState({ ...FORMS, create: EMPTY_TOPIC });
  const [busy, setBusy] = useState(false);

  const load = () => {
    setLoading(true);
    api
      .omTopics()
      .then((d) => {
        setItems(d.items);
        setLeaderboard(d.leaderboard);
        setMyPoints(d.myPoints);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  const guard = () => {
    if (!user) {
      navigate('/login');
      return false;
    }
    return true;
  };

  const applyResult = (topicId, res) => {
    setItems((list) => list.map((t) => (t.id === topicId ? { ...t, ...res.stats, my: res.my } : t)));
    if (res.myPoints !== undefined) setMyPoints(res.myPoints);
  };

  const follow = async (t) => {
    if (!guard()) return;
    try {
      const res = await api.omFollow(t.id);
      applyResult(t.id, res);
    } catch (e) {
      setError(e.message);
    }
  };

  const openModal = (kind, topic) => {
    if (!guard()) return;
    setTarget(topic);
    setForms((f) => ({ ...f, [kind]: FORMS[kind] ? { ...FORMS[kind] } : { ...EMPTY_TOPIC } }));
    setError('');
    setModal(kind);
  };

  const submitForm = async (e) => {
    e.preventDefault();
    if (!target) return;
    setBusy(true);
    setError('');
    try {
      let res;
      if (modal === 'create') {
        const d = await api.createOmTopic(forms.create);
        setItems([d.topic, ...items]);
        setModal(null);
        return;
      }
      if (modal === 'participate') res = await api.omParticipate(target.id, forms.participate);
      if (modal === 'claim') res = await api.omClaim(target.id, forms.claim);
      if (modal === 'sponsor') res = await api.omSponsor(target.id, forms.sponsor);
      applyResult(target.id, res);
      setModal(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const setF = (key, value) => setForms((f) => ({ ...f, [modal]: { ...f[modal], [key]: value } }));

  const closeModal = () => {
    setModal(null);
    setTarget(null);
    setError('');
  };

  return (
    <div className="container">
      <div className="breadcrumb">
        <Link to="/">首页</Link> / <span>OpenMedAI 协作平台</span>
      </div>

      <div className="recruit-head card">
        <h1>🧠 OpenMedAI · 医学 AI 协作板块</h1>
        <p>
          医学 AI 主题协作原生接入本站：发起主题、<b>参与（分工意向 + 排名意向 + 每周投入）</b>、认领任务、资助意向、
          关注与评分，申请由发起人审核通过后正式加入团队，贡献自动计入积分。
        </p>
        <div className="repo-btns" style={{ marginTop: 14, marginBottom: 0 }}>
          <button className="btn btn-primary" onClick={() => openModal('create', null)}>✏️ 发起主题</button>
          <Link to="/recruit" className="btn btn-outline">🤝 去招募组队</Link>
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="detail-layout">
        <div>
          <section className="section" style={{ marginTop: 20 }}>
            <div className="section-head">
              <h2>主题广场</h2>
              <span className="field-hint">{items.length} 个主题</span>
            </div>
            {loading ? (
              <div className="loading">加载中…</div>
            ) : items.length === 0 ? (
              <div className="empty"><div className="icon">🧪</div><h3>还没有主题</h3><p>成为第一个发起医学 AI 主题的人吧！</p></div>
            ) : (
              <div className="grid-2">
                {items.map((t) => (
                  <article key={t.id} className="card card-hover post-card">
                    <div className="post-card-top">
                      <span className="chip repo-cat">{t.direction}</span>
                      <span className="comp-status" style={{ color: OM_STATUS_COLORS[t.status] || '#64748b', borderColor: `${OM_STATUS_COLORS[t.status] || '#64748b'}66` }}>
                        ● {t.status}
                      </span>
                      <MyChips my={t.my} />
                    </div>
                    <Link to={`/openmedai/topic/${t.id}`} className="post-title">{t.title}</Link>
                    <p className="post-excerpt">{t.description}</p>
                    <div className="article-tags">
                      {(t.tags || []).slice(0, 4).map((x) => <span key={x} className="tag">#{x}</span>)}
                    </div>
                    <div className="meta-row">
                      <span className="author-chip">
                        <span className="avatar avatar-sm" style={{ background: t.owner?.color || '#0f8a5f' }}>
                          {(t.owner?.username || '?').slice(0, 1).toUpperCase()}
                        </span>
                        {t.owner?.username || '用户'}
                      </span>
                      <span>{fmtDate(t.createdAt)}</span>
                    </div>
                    <div className="meta-row" style={{ marginTop: 2 }}>
                      <span>👥 已加入 {t.participants}</span>
                      <span>🙋 参与 {t.participations}</span>
                      <span>📋 认领 {t.approvedClaims}/{t.claims}</span>
                      <span>🎁 资助 {t.approvedSponsors}</span>
                      <span>⭐ {t.avgScore ?? '—'}</span>
                    </div>
                    <div className="repo-btns" style={{ marginTop: 8, marginBottom: 0 }}>
                      <button className={`btn btn-sm ${t.my?.followed ? 'btn-soft' : 'btn-outline'}`} onClick={() => follow(t)}>
                        ⭐ {t.my?.followed ? '已关注 ✓' : '关注'}
                      </button>
                      <button className="btn btn-sm btn-outline" onClick={() => openModal('participate', t)}>🙋 参与</button>
                      <button className="btn btn-sm btn-outline" onClick={() => openModal('claim', t)}>📋 认领</button>
                      <button className="btn btn-sm btn-outline" onClick={() => openModal('sponsor', t)}>🎁 资助</button>
                      <Link to={`/openmedai/topic/${t.id}`} className="btn btn-ghost btn-sm">详情 →</Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="detail-side">
          <div className="card aside-card">
            <div className="aside-title">🏅 协作积分榜</div>
            {leaderboard.length === 0 ? (
              <p className="field-hint" style={{ margin: 0 }}>暂无积分记录</p>
            ) : (
              leaderboard.map((x, i) => (
                <div key={x.user.id} className="admin-list-item">
                  <span className="avatar avatar-sm" style={{ background: x.user.color }}>{x.user.username.slice(0, 1).toUpperCase()}</span>
                  <span className="title">{i + 1}. {x.user.username}</span>
                  <span className="time">{x.points} 分</span>
                </div>
              ))
            )}
            {user && <p className="field-hint" style={{ margin: '10px 0 0' }}>我的积分：<b style={{ color: 'var(--brand-dark)' }}>{myPoints ?? 0}</b></p>}
          </div>
          <div className="card aside-card">
            <div className="aside-title">🎯 积分规则</div>
            <p className="field-hint" style={{ margin: 0 }}>
              发起主题 +20 · 关注 +2<br />
              参与/认领/资助：待审核 +5/+8/+5，审核通过 +10/+15/+10<br />
              评分 +3
            </p>
          </div>
          <div className="card aside-card">
            <div className="aside-title">🔗 官方资源</div>
            <a href="https://www.openmedai.cn/" target="_blank" rel="noreferrer" className="aside-item">
              <span className="aside-item-title">OpenMedAI 官网</span><span className="aside-item-meta">↗</span>
            </a>
            <a href="https://github.com/OpenMedAILab/openmedailab-platform" target="_blank" rel="noreferrer" className="aside-item">
              <span className="aside-item-title">平台源码</span><span className="aside-item-meta">↗</span>
            </a>
          </div>
        </aside>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>
              {modal === 'create' && '✏️ 发起医学 AI 主题'}
              {modal === 'participate' && `🙋 参与「${target?.title?.slice(0, 24)}${(target?.title?.length || 0) > 24 ? '…' : ''}」`}
              {modal === 'claim' && `📋 认领「${target?.title?.slice(0, 24)}${(target?.title?.length || 0) > 24 ? '…' : ''}」`}
              {modal === 'sponsor' && `🎁 资助「${target?.title?.slice(0, 24)}${(target?.title?.length || 0) > 24 ? '…' : ''}」`}
            </h2>
            {error && <div className="form-error">{error}</div>}
            <form onSubmit={submitForm}>
              {modal === 'create' && (
                <>
                  <div className="field">
                    <label>主题标题<span className="req">*</span></label>
                    <input value={forms.create.title} onChange={(e) => setForms((f) => ({ ...f, create: { ...f.create, title: e.target.value } }))}
                      placeholder="如：多模态医学影像智能诊断" maxLength={60} required />
                  </div>
                  <div className="form-row">
                    <div className="field">
                      <label>研究方向<span className="req">*</span></label>
                      <select value={forms.create.direction} onChange={(e) => setForms((f) => ({ ...f, create: { ...f.create, direction: e.target.value } }))}>
                        {OM_DIRECTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div className="field">
                      <label>状态</label>
                      <select value={forms.create.status} onChange={(e) => setForms((f) => ({ ...f, create: { ...f.create, status: e.target.value } }))}>
                        {OM_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="field">
                    <label>主题描述<span className="req">*</span></label>
                    <textarea rows={4} value={forms.create.description} onChange={(e) => setForms((f) => ({ ...f, create: { ...f.create, description: e.target.value } }))} required />
                  </div>
                  <div className="field">
                    <label>预期产出 / 任务清单</label>
                    <textarea rows={3} value={forms.create.deliverables} onChange={(e) => setForms((f) => ({ ...f, create: { ...f.create, deliverables: e.target.value } }))} />
                  </div>
                  <div className="field">
                    <label>标签（逗号分隔）</label>
                    <input value={forms.create.tags} onChange={(e) => setForms((f) => ({ ...f, create: { ...f.create, tags: e.target.value } }))} />
                  </div>
                </>
              )}
              {modal === 'participate' && (
                <>
                  <div className="form-row">
                    <div className="field">
                      <label>分工意向<span className="req">*</span></label>
                      <select value={forms.participate.role} onChange={(e) => setF('role', e.target.value)}>
                        {OM_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <div className="field">
                      <label>每周可投入（小时）</label>
                      <input type="number" min="0" max="60" value={forms.participate.hoursPerWeek}
                        onChange={(e) => setF('hoursPerWeek', Number(e.target.value))} />
                    </div>
                  </div>
                  <div className="field">
                    <label>排名/署名意向<span className="req">*</span></label>
                    <select value={forms.participate.authorshipIntent} onChange={(e) => setF('authorshipIntent', e.target.value)}>
                      {OM_AUTHORSHIP.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label>自我介绍与想法</label>
                    <textarea rows={3} value={forms.participate.note} onChange={(e) => setF('note', e.target.value)}
                      placeholder="说说你的经验、时间安排与期待…" />
                  </div>
                  <p className="field-hint">提交后进入<b>待审核</b>状态，发起人通过后正式加入团队并计入积分。</p>
                </>
              )}
              {modal === 'claim' && (
                <>
                  <div className="field">
                    <label>认领类型<span className="req">*</span></label>
                    <select value={forms.claim.claimType} onChange={(e) => setF('claimType', e.target.value)}>
                      {OM_CLAIM_TYPES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label>备注</label>
                    <textarea rows={3} value={forms.claim.note} onChange={(e) => setF('note', e.target.value)} />
                  </div>
                  <p className="field-hint">认领同样需要发起人审核通过，请与课题分工保持一致。</p>
                </>
              )}
              {modal === 'sponsor' && (
                <>
                  <div className="field">
                    <label>资助类型<span className="req">*</span></label>
                    <select value={forms.sponsor.sponsorType} onChange={(e) => setF('sponsorType', e.target.value)}>
                      {OM_SPONSOR_TYPES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label>备注</label>
                    <textarea rows={3} value={forms.sponsor.note} onChange={(e) => setF('note', e.target.value)}
                      placeholder="可说明资助内容与范围…" />
                  </div>
                  <p className="field-hint">资助意向由发起人审核后展示在主题详情。</p>
                </>
              )}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost" onClick={closeModal}>取消</button>
                <button type="submit" className="btn btn-primary" disabled={busy}>
                  {busy ? '提交中…' : modal === 'create' ? '发布主题' : '提交申请'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
