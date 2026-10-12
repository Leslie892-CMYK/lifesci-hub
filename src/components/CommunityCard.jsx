import { Link } from 'react-router-dom';
import { COMMUNITY_TYPE_META } from '../utils.js';
import { FileIcon, UsersIcon } from './Icons.jsx';

export default function CommunityCard({ community, onJoin, busy }) {
  const type = COMMUNITY_TYPE_META[community.type] || COMMUNITY_TYPE_META.general;
  return (
    <div className="card card-hover community-card">
      <div className="community-card-head">
        <span className="community-avatar" style={{ background: community.color }}>
          {community.name.slice(0, 1)}
        </span>
        <div>
          <Link to={`/communities/${community.slug || community.id}`} className="community-name">
            {community.name}
          </Link>
          <span className="chip chip-soft" style={{ background: '#f2f4f3', color: community.color, marginTop: 4 }}>
            {type.label}
          </span>
        </div>
      </div>
      <p className="community-desc">{community.description}</p>
      <div className="community-foot">
        <span className="meta-item"><UsersIcon width={13} height={13} />{community.members} 成员</span>
        <span className="meta-item"><FileIcon width={13} height={13} />{community.posts} 帖子</span>
        <button
          className={`btn btn-sm ${community.joined ? 'btn-ghost' : 'btn-primary'}`}
          disabled={busy}
          onClick={() => onJoin(community)}
        >
          {community.joined ? '已加入 ✓' : '+ 加入'}
        </button>
      </div>
    </div>
  );
}
