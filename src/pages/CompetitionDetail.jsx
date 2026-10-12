import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import CommentSection from '../components/CommentSection.jsx';
import { EyeIcon, CommentIcon } from '../components/Icons.jsx';
import {
  COMPETITION_LEVEL_COLORS,
  COMPETITION_STATUS_COLORS,
  daysLeft,
  fmtDateTime,
  renderParagraphs
} from '../utils.js';

export default function CompetitionDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [comp, setComp] = useState(null);
  const [comments, setComments] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setError('');
    api
      .competition(id)
      .then((d) => {
        if (!alive) return;
        setComp(d.competition);
        setComments(d.comments);
      })
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [id]);

  if (error) {
    return (
      <div className="container">
        <div className="empty">
          <div className="icon">🏆</div>
          <h3>{error}</h3>
          <Link to="/competitions" className="btn btn-primary">返回比赛动态</Link>
        </div>
      </div>
    );
  }

  if (!comp) return <div className="loading">加载中…</div>;

  const left = comp.deadline ? daysLeft(comp.deadline) : null;
  // 未关联社区的条目默认跳转到「学科竞赛交流」社区
  const comm = comp.community || { name: '学科竞赛交流', slug: 'competition-hub', color: '#b45309' };

  return (
    <div className="container">
      <div className="breadcrumb">
        <Link to="/">首页</Link> / <Link to="/competitions">比赛动态</Link> / <span>{comp.title}</span>
      </div>

      <div className="detail-layout">
        <div>
          <article className="card article-detail">
            <div className="article-card-top">
              <span className="comp-level" style={{ background: COMPETITION_LEVEL_COLORS[comp.catalogLevel] || '#94a3b8' }}>
                目录 {comp.catalogLevel}
              </span>
              <span
                className="comp-status"
                style={{ color: COMPETITION_STATUS_COLORS[comp.status] || '#64748b', borderColor: `${COMPETITION_STATUS_COLORS[comp.status] || '#64748b'}66` }}
              >
                ● {comp.status}
              </span>
              <span className="chip repo-cat">{comp.type}</span>
              {comp.source === '官网同步' && <span className="chip chip-tech">官网同步</span>}
            </div>

            <h1>{comp.title}</h1>
            <div className="meta-row" style={{ marginBottom: 14 }}>
              <span>主办：{comp.organizer || '—'}</span>
              <span>{fmtDateTime(comp.publishedAt)}</span>
              <span className="meta-item"><EyeIcon width={13} height={13} />{comp.views} 浏览</span>
              <span className="meta-item"><CommentIcon width={13} height={13} />{comments.length} 评论</span>
            </div>

            <div className="comp-community-banner">
              <span>
                💬 想组队或交流备赛经验？前往社区
                <b>「{comm.name}」</b>
              </span>
              <Link to={`/communities/${comm.slug || comm.id}`} className="btn btn-primary btn-sm">
                去社区讨论 / 组队 →
              </Link>
            </div>

            <div className="value-card">
              <div className="repo-section-title">🏅 含金量认定</div>
              <div className="value-row">
                <span>学校竞赛目录等级：<b style={{ color: COMPETITION_LEVEL_COLORS[comp.catalogLevel] }}>{comp.catalogLevel}</b></span>
                <span>赛事级别：<b>{comp.level}</b></span>
                <span>
                  推荐指数：<b className="stars">{'★'.repeat(comp.star)}{'☆'.repeat(5 - comp.star)}</b>
                </span>
              </div>
              <p className="value-note">
                目录等级依据学校认定的《大学生学科竞赛目录》标注，请以创新创业学院（cxcy.hmc.edu.cn）最新发布为准。
                {comp.catalogLevel === '待认定' && ' 本条为新同步通知，等级待管理员核定。'}
              </p>
            </div>

            <div className="article-summary-box">{comp.intro}</div>

            {comp.timeline?.length > 0 && (
              <>
                <div className="repo-section-title">⏱️ 时间安排</div>
                <ul className="timeline-list">
                  {comp.timeline.map((t, i) => (
                    <li key={i}>
                      <span className="tl-label">{t.label}</span>
                      <span className="tl-date">{t.date}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {comp.deadline && (
              <div className={`comp-deadline-banner ${left === '已截止' ? 'closed' : ''}`}>
                ⏰ 报名 / 提交截止：{comp.deadline}（{left}）
              </div>
            )}

            {comp.submission && (
              <>
                <div className="repo-section-title">📦 提交作品内容</div>
                <div className="article-content">
                  {renderParagraphs(comp.submission).map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              </>
            )}

            {comp.content && (
              <>
                <div className="repo-section-title">📄 详情与通知原文</div>
                <div className="article-content">
                  {renderParagraphs(comp.content).map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              </>
            )}

            {comp.sourceUrl && (
              <div className="detail-actions">
                <a className="btn btn-outline btn-sm" href={comp.sourceUrl} target="_blank" rel="noreferrer">
                  查看学校官网通知原文 ↗
                </a>
              </div>
            )}

            <div className="detail-tags" style={{ marginTop: 16 }}>
              {(comp.tags || []).map((t) => (
                <span key={t} className="tag">#{t}</span>
              ))}
            </div>
          </article>

          <div className="card" style={{ marginTop: 20, padding: '24px 34px' }}>
            <CommentSection
              targetType="competition"
              targetId={comp.id}
              comments={comments}
              onAdded={(c) => setComments([...comments, c])}
            />
          </div>
        </div>

        <aside className="detail-side">
          <div className="card aside-card">
            <div className="aside-title">🏆 参赛指南</div>
            <Link to="/recruit" className="aside-item"><span className="aside-item-title">去招募组队广场找队友</span><span className="aside-item-meta">→</span></Link>
            <Link to="/competitions?level=A类" className="aside-item"><span className="aside-item-title">查看全部 A类 竞赛</span><span className="aside-item-meta">→</span></Link>
            <Link to="/competitions?status=报名中" className="aside-item"><span className="aside-item-title">正在报名中的比赛</span><span className="aside-item-meta">→</span></Link>
            <a href="https://cxcy.hmc.edu.cn/sy/tzgg/" target="_blank" rel="noreferrer" className="aside-item">
              <span className="aside-item-title">学校创新创业学院官网</span><span className="aside-item-meta">↗</span>
            </a>
          </div>
          <div className="card aside-card">
            <div className="aside-title">💡 目录说明</div>
            <p className="field-hint" style={{ margin: 0 }}>
              学科竞赛目录由学校统一认定：A类为国家级高含金量赛事（挑战杯、互联网+、生命科学竞赛等），B类为省级及部分国家级赛事。评奖评优、推免加分以学校最新文件为准。
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
