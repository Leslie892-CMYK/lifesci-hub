import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import RepoCard from '../components/RepoCard.jsx';
import { SearchIcon, PlusIcon, ChevronLeftIcon, ChevronRightIcon } from '../components/Icons.jsx';
import { REPO_TYPES, REPO_CATEGORY_META } from '../utils.js';

export default function Repo() {
  const [searchParams, setSearchParams] = useSearchParams();
  const type = searchParams.get('type') || '';
  const category = searchParams.get('category') || '';
  const q = searchParams.get('q') || '';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));

  const [data, setData] = useState({ items: [], total: 0, pages: 1, page: 1 });
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState(q);

  useEffect(() => {
    setLoading(true);
    api
      .repo({ type, category, q, page })
      .then(setData)
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, [type, category, q, page]);

  const setParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setSearchParams(next, { replace: true });
  };

  const onSearch = (e) => {
    e.preventDefault();
    setParam('q', input.trim());
  };

  return (
    <div className="container">
      <div className="recruit-head card">
        <h1>🧰 科研工具仓库</h1>
        <p>
          精选适合科研的 Agent Skill 与 MCP 服务器：文献检索、数据分析、论文写作、实验效率……
          每件工具附详细介绍、安装方式与使用示例，一键直达下载。也欢迎大家提交自己用过的好工具。
        </p>
        <div style={{ marginTop: 14 }}>
          <Link to="/repo/submit" className="btn btn-primary">
            <PlusIcon width={15} height={15} /> 提交精选工具
          </Link>
        </div>
      </div>

      <div className="toolbar">
        <div className="tabs">
          <button className={`tab ${!type ? 'active' : ''}`} onClick={() => setParam('type', '')}>
            全部
          </button>
          {REPO_TYPES.map((t) => (
            <button
              key={t.key}
              className={`tab ${type === t.key ? 'active' : ''}`}
              onClick={() => setParam('type', t.key)}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
        <div className="tabs" style={{ marginBottom: 10 }}>
          <button className={`tab ${!category ? 'active' : ''}`} onClick={() => setParam('category', '')}>
            全部分类
          </button>
          {Object.values(REPO_CATEGORY_META).map((c) => (
            <button
              key={c.key}
              className={`tab ${category === c.key ? 'active' : ''}`}
              onClick={() => setParam('category', c.key)}
            >
              {c.icon} {c.label}
            </button>
          ))}
        </div>
        <div className="filter-row">
          <form className="search-box" onSubmit={onSearch}>
            <input
              type="text"
              placeholder="搜索工具名称 / 作者 / 标签…（如：arXiv、Zotero、写作）"
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
          <div className="icon">🔍</div>
          <h3>没有找到相关工具</h3>
          <p>换个关键词或分类试试，或者提交你发现的优质工具。</p>
        </div>
      ) : (
        <>
          <div className="grid-3">
            {data.items.map((r) => <RepoCard key={r.id} item={r} />)}
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
                第 {data.page} / {data.pages} 页 · 共 {data.total} 件工具
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
