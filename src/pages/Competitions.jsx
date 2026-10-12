import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import CompCard from '../components/CompCard.jsx';
import { SearchIcon, PlusIcon, ChevronLeftIcon, ChevronRightIcon } from '../components/Icons.jsx';
import { COMPETITION_STATUSES, COMPETITION_LEVELS } from '../utils.js';

export default function Competitions() {
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get('status') || '';
  const level = searchParams.get('level') || '';
  const q = searchParams.get('q') || '';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));

  const [data, setData] = useState({ items: [], total: 0, pages: 1, page: 1 });
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState(q);

  useEffect(() => {
    setLoading(true);
    api
      .competitions({ status, level, q, page })
      .then(setData)
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, [status, level, q, page]);

  const setParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="container">
      <div className="recruit-head card">
        <h1>🏆 比赛动态</h1>
        <p>
          与学校相关的学科竞赛通知：比赛介绍、按学校竞赛目录认定的含金量、时间安排与提交作品要求。
          新通知由学校创新创业学院官网（cxcy.hmc.edu.cn）自动同步，点击比赛详情可跳转到社区组队交流。
        </p>
        <div style={{ marginTop: 14 }}>
          <Link to="/competitions/submit" className="btn btn-primary">
            <PlusIcon width={15} height={15} /> 发布比赛通知
          </Link>
        </div>
      </div>

      <div className="toolbar">
        <div className="tabs">
          <button className={`tab ${!status ? 'active' : ''}`} onClick={() => setParam('status', '')}>全部状态</button>
          {COMPETITION_STATUSES.map((s) => (
            <button key={s} className={`tab ${status === s ? 'active' : ''}`} onClick={() => setParam('status', s)}>
              {s}
            </button>
          ))}
        </div>
        <div className="tabs" style={{ marginBottom: 10 }}>
          <button className={`tab ${!level ? 'active' : ''}`} onClick={() => setParam('level', '')}>全部目录等级</button>
          {COMPETITION_LEVELS.map((l) => (
            <button key={l} className={`tab ${level === l ? 'active' : ''}`} onClick={() => setParam('level', l)}>
              {l}
            </button>
          ))}
        </div>
        <div className="filter-row">
          <form
            className="search-box"
            onSubmit={(e) => {
              e.preventDefault();
              setParam('q', input.trim());
            }}
          >
            <input
              type="text"
              placeholder="搜索比赛名称 / 关键词…（如：挑战杯、生命科学、数学建模）"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button type="submit" aria-label="搜索"><SearchIcon width={16} height={16} /></button>
          </form>
        </div>
      </div>

      {loading ? (
        <div className="loading">加载中…</div>
      ) : data.items.length === 0 ? (
        <div className="empty">
          <div className="icon">🏆</div>
          <h3>没有找到相关比赛</h3>
          <p>换个筛选条件试试，或留意学校官网最新通知。</p>
        </div>
      ) : (
        <>
          <div className="grid-3">
            {data.items.map((c) => <CompCard key={c.id} comp={c} />)}
          </div>
          {data.pages > 1 && (
            <div className="pagination">
              <button
                className="btn btn-outline btn-sm"
                disabled={data.page <= 1}
                onClick={() => setParam('page', String(data.page - 1))}
              >
                <ChevronLeftIcon width={14} height={14} />上一页
              </button>
              <span className="page-info">
                第 {data.page} / {data.pages} 页 · 共 {data.total} 条比赛信息
              </span>
              <button
                className="btn btn-outline btn-sm"
                disabled={data.page >= data.pages}
                onClick={() => setParam('page', String(data.page + 1))}
              >
                下一页<ChevronRightIcon width={14} height={14} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
