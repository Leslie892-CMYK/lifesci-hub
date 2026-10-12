import { Link } from 'react-router-dom';
import {
  COMPETITION_LEVEL_COLORS,
  COMPETITION_STATUS_COLORS,
  daysLeft,
  fmtDate
} from '../utils.js';

export default function CompCard({ comp }) {
  return (
    <article className="card card-hover comp-card">
      <div className="comp-card-top">
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
      </div>
      <Link to={`/competitions/${comp.id}`} className="repo-name">{comp.title}</Link>
      <p className="article-summary">{comp.intro}</p>
      <div className="comp-meta">
        <span className="meta-item">🏅 {comp.catalogLevel} · {comp.level}</span>
        {comp.deadline && (
          <span className={`comp-deadline ${daysLeft(comp.deadline) === '已截止' ? 'closed' : ''}`}>
            ⏰ {daysLeft(comp.deadline)}
          </span>
        )}
      </div>
      <div className="meta-row">
        <span>{comp.organizer || '创新创业学院'}</span>
        <Link
          to={`/communities/${(comp.community || { slug: 'competition-hub' }).slug || (comp.community || { id: '' }).id}`}
          className="community-chip"
          style={{ color: comp.community?.color || '#b45309' }}
        >
          💬 {comp.community?.name || '学科竞赛交流'}
        </Link>
        <span>{fmtDate(comp.publishedAt)}</span>
      </div>
    </article>
  );
}
