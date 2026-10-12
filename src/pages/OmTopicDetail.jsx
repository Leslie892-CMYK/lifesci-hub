import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { EyeIcon } from '../components/Icons.jsx';
import {
  OM_STATUS_COLORS,
  OM_AUTHORSHIP_LABEL,
  OM_CLAIM_TYPE_LABEL,
  OM_SPONSOR_TYPE_LABEL,
  fmtDate,
  renderParagraphs
} from '../utils.js';

const STATUS_TEXT = { approved: '已通过', pending: '待审核', rejected: '已拒绝' };
const STATUS_COLOR = { approved: '#0f8a5f', pending: '#c2410c', rejected: '#b91c1c' };

export default function OmTopicDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = () => {
    api
      .omTopic(id)
      .then(setData)
      .catch((e) => setError(e.message));
  };
  useEffect(load, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const guard = () => {
    if (!user) {
      navigate('/login');
      return false;
    }
    return true;
  };

  const act = async (fn, topicId) => {
    if (!guard()) return;
    try {
      await fn();
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  if (error) {
    return (
      <div className="container">
        <div className="empty">
          <div className="icon">🧠</div>
          <h3>{error}</h3>
          <Link to="/openmedai" className="btn btn-primary">返回协作板块</Link>
        </div>
      </div>
    );
  }

  if (!data) return <div className="loading">加载中…</div>;

  const { topic: t, team, approvedClaims, approvedSponsors, pending, scores, leaderboard, myPoints, isManager } = data;
  const my = t.my;

  const review = (kind, recordId, approved) =>
    act(() => api.omReview(t.id, recordId, kind, approved), t.id);
  const withdraw = (kind) => act(() => api.omWithdraw(t.id, kind), t.id);
  const follow = () => act(() => api.omFollow(t.id), t.id);
  const score = (v) => act(() => api.omScore(t.id, v), t.id);

  const myRecord = (record, typeLabel) =>
    record && (
      <div className="card" style={{ padding: '12px 16px', marginBottom: 14 }}>
        <div className="comp-card-top" style={{ marginBottom: 6 }}>
          <b>{typeLabel}</b>
          <span className="comp-status" style={{ color: STATUS_COLOR[record.status], borderColor: `${STATUS_COLOR[record.status]}66` }}>
            {STATUS_TEXT[record.status] || record.status}
          </span>
        </div>
        {record.role && (
          <div className="meta-row" style={{ marginBottom: 4 }}>
            <span>分工：<b>{record.role}</b></span>
            <span>签名意向：{OM_AUTHORSHIP_LABEL[record.authorshipIntent] || record.authorshipIntent}</span>
            {record.hoursPerWeek > 0 && <span>每周 {record.hoursPerWeek}h</span>}
          </div>
        )}
        {record.claimType && <p className="field-hint" style={{ marginTop: 4 }}>{OM_CLAIM_TYPE_LABEL[record.claimType] || record.claimType}</p>}
        {record.sponsorType && <p className="field-hint" style={{ marginTop: 4 }}>{OM_SPONSOR_TYPE_LABEL[record.sponsorType] || record.sponsorType}</p>}
        {record.note && <p className="field-hint" style={{ marginTop: 4 }}>{record.note}</p>}
        {record.status === 'pending' && (
          <button className="btn btn-outline btn-sm danger" style={{ marginTop: 8 }} onClick={() => withdraw(typeLabel === '参与' ? 'participation' : typeLabel === '认领' ? 'claim' : 'sponsor')}>
            撤回申请
          </button>
        )}
      </div>
    );

  return (
    <div className="container">
      <div className="breadcrumb">
        <Link to="/">首页</Link> / <Link to="/openmedai">OpenMedAI 协作板块</Link> / <span>{t.title}</span>
      </div>

      <div className="detail-layout">
        <div>
          <article className="card article-detail">
            <div className="article-card-top">
              <span className="chip repo-cat">{t.direction}</span>
              <span className="comp-status" style={{ color: OM_STATUS_COLORS[t.status] || '#64748b', borderColor: `${OM_STATUS_COLORS[t.status] || '#64748b'}66` }}>
                ● {t.status}
              </span>
              {t.my?.followed && <span className="tag" style={{ background: '#e6f4ee', color: '#0a6b4a', fontWeight: 700 }}>已关注</span>}
            </div>
            <h1>{t.title}</h1>
            <div className="meta-row" style={{ marginBottom: 14 }}>
              <span className="author-chip">
                <span className="avatar avatar-sm" style={{ background: t.owner?.color || '#0f8a5f' }}>
                  {(t.owner?.username || '?').slice(0, 1).toUpperCase()}
                </span>
                {t.owner?.username || '用户'}
              </span>
              <span>发起于 {fmtDate(t.createdAt)}</span>
              <span className="meta-item"><EyeIcon width={13} height={13} />{t.views + 1}</span>
              <span>⭐ {t.avgScore ?? '暂无评分'}</span>
            </div>

            <div className="comp-community-banner" style={{ marginBottom: 16 }}>
              <span>
                👥 已加入 <b>{t.participants}</b> 人 · 🙋 参与 {t.participations} · 📋 认领 {t.approvedClaims}/{t.claims}
                · 🎁 资助 {t.approvedSponsors} · ⭐ {t.scores} 人评分
              </span>
              <button className={`btn btn-primary btn-sm ${my?.followed ? 'btn-soft' : ''}`} onClick={follow}>
                {my?.followed ? '已关注 ✓' : '⭐ 关注'}
              </button>
            </div>

            <div className="article-summary-box">
              {t.description.split(/\n+/).map((p, i) => <p key={i} style={{ margin: i ? 8 : 0 }}>{p}</p>)}
            </div>

            {t.deliverables && (
              <>
                <div className="repo-section-title">📦 预期产出 / 任务</div>
                <div className="article-content">
                  {renderParagraphs(t.deliverables).map((p, i) => <p key={i}>{p}</p>)}
                </div>
              </>
            )}

            <div className="detail-tags">
              {(t.tags || []).map((x) => <span key={x} className="tag">#{x}</span>)}
            </div>

            <div className="detail-actions">
              <Link to={`/openmedai/topic/${t.id}?score=1`} className="btn btn-outline btn-sm" onClick={(e) => { e.preventDefault(); act(() => api.omScore(t.id, (my?.score || 5)), t.id); }}>
                {my?.score ? `我的评分 ${my.score} 分（点击可更新）` : '评分（1-10）'}
              </Link>
              <Link to="/openmedai" className="btn btn-outline btn-sm">← 返回板块</Link>
            </div>
          </article>

          {my && (
            <div className="card" style={{ marginTop: 20, padding: '24px 34px' }}>
              <div className="repo-section-title">🙋 我的申请</div>
              {myRecord(my.participation, '参与')}
              {myRecord(my.claim, '认领')}
              {myRecord(my.sponsor, '资助')}
              {!my.participation && !my.claim && !my.sponsor && (
                <p className="field-hint" style={{ margin: 0 }}>
                  还没有提交申请，回到板块列表点击「参与 / 认领 / 资助」留下你的意向。
                </p>
              )}
            </div>
          )}

          <div className="card" style={{ marginTop: 20, padding: '24px 34px' }}>
            <div className="repo-section-title">👥 团队分工（已通过）</div>
            {team.length === 0 ? (
              <p className="field-hint" style={{ margin: 0 }}>暂无成员，快邀请同学参与吧。</p>
            ) : (
              <div className="grid-3" style={{ marginBottom: 18 }}>
                {team.map((p) => (
                  <div key={p.id} className="card" style={{ padding: '12px 14px' }}>
                    <div className="meta-row" style={{ marginBottom: 6 }}>
                      <span className="author-chip">
                        <span className="avatar avatar-sm" style={{ background: p.user?.color || '#0f8a5f' }}>
                          {(p.user?.username || '?').slice(0, 1).toUpperCase()}
                        </span>
                        {p.user?.username || '用户'}
                      </span>
                    </div>
                    <div className="meta-row">
                      <span className="tag" style={{ fontWeight: 700 }}>{p.role}</span>
                    </div>
                    <p className="field-hint" style={{ margin: '6px 0 0' }}>
                      署名：{OM_AUTHORSHIP_LABEL[p.authorshipIntent] || p.authorshipIntent}
                      {p.hoursPerWeek > 0 && <> · 每周 {p.hoursPerWeek}h</>}
                    </p>
                    {p.note && <p className="field-hint" style={{ margin: '6px 0 0' }}>{p.note}</p>}
                  </div>
                ))}
              </div>
            )}

            {approvedClaims.length > 0 && (
              <>
                <div className="repo-section-title">📋 已认领</div>
                <div className="meta-row" style={{ marginBottom: 14 }}>
                  {approvedClaims.map((c) => (
                    <span key={c.id} className="tag" style={{ fontWeight: 700 }}>
                      {c.user?.username}：{OM_CLAIM_TYPE_LABEL[c.claimType] || c.claimType}
                    </span>
                  ))}
                </div>
              </>
            )}

            {approvedSponsors.length > 0 && (
              <>
                <div className="repo-section-title">🎁 已资助</div>
                <div className="meta-row">
                  {approvedSponsors.map((s) => (
                    <span key={s.id} className="tag" style={{ fontWeight: 700 }}>
                      {s.user?.username}：{OM_SPONSOR_TYPE_LABEL[s.sponsorType] || s.sponsorType}
                    </span>
                  ))}
                </div>
              </>
            )}

            {scores.length > 0 && (
              <>
                <div className="repo-section-title" style={{ marginTop: 18 }}>⭐ 评分记录</div>
                <div className="meta-row">
                  {scores.map((s) => (
                    <span key={s.id} className="tag">{s.user?.username}: {s.score} 分</span>
                  ))}
                </div>
              </>
            )}
          </div>

          {isManager && pending && (
            <div className="card" style={{ marginTop: 20, padding: '24px 34px', borderColor: '#f3e2bd', background: '#fffbf2' }}>
              <div className="repo-section-title">🧾 待审核申请（发起人）</div>
              {pending.participations.length === 0 && pending.claims.length === 0 && pending.sponsors.length === 0 && (
                <p className="field-hint" style={{ margin: 0 }}>暂无待审核申请。</p>
              )}
              {[...pending.participations, ...pending.claims, ...pending.sponsors].map((r) => (
                <div key={r.id} className="admin-list-item" style={{ alignItems: 'center' }}>
                  <span className="avatar avatar-sm" style={{ background: r.user?.color || '#0f8a5f' }}>
                    {(r.user?.username || '?').slice(0, 1).toUpperCase()}
                  </span>
                  <span className="title">
                    <b>{r.user?.username}</b>
                    {r.role && <> · {r.role} · {OM_AUTHORSHIP_LABEL[r.authorshipIntent] || ''} · {r.hoursPerWeek}h/周</>}
                    {r.claimType && <> · {OM_CLAIM_TYPE_LABEL[r.claimType]}</>}
                    {r.sponsorType && <> · {OM_SPONSOR_TYPE_LABEL[r.sponsorType]}</>}
                    {r.note && <span style={{ color: 'var(--muted)' }}> · {r.note}</span>}
                  </span>
                  <div className="admin-actions">
                    <button className="btn btn-primary btn-sm" onClick={() => review(r.claimType ? 'claim' : r.sponsorType ? 'sponsor' : 'participation', r.id, true)}>通过</button>
                    <button className="btn btn-outline btn-sm danger" onClick={() => review(r.claimType ? 'claim' : r.sponsorType ? 'sponsor' : 'participation', r.id, false)}>拒绝</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <aside className="detail-side">
          <div className="card aside-card">
            <div className="aside-title">🏅 协作积分榜</div>
            {leaderboard.map((x, i) => (
              <div key={x.user.id} className="admin-list-item">
                <span className="avatar avatar-sm" style={{ background: x.user.color }}>{x.user.username.slice(0, 1).toUpperCase()}</span>
                <span className="title">{i + 1}. {x.user.username}</span>
                <span className="time">{x.points} 分</span>
              </div>
            ))}
            {user && <p className="field-hint" style={{ margin: '10px 0 0' }}>我的积分：<b style={{ color: 'var(--brand-dark)' }}>{myPoints ?? 0}</b></p>}
          </div>
          <div className="card aside-card">
            <div className="aside-title">🎯 参与流程</div>
            <p className="field-hint" style={{ margin: 0 }}>
              1. 选择分工意向、排名意向与每周投入<br />
              2. 提交后等待发起人审核<br />
              3. 通过后成为团队成员并计分<br />
              4. 完成后可按贡献申请署名
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
