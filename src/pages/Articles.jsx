import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import ArticleCard from '../components/ArticleCard.jsx';
import OphJournalSections from '../components/OphJournalSections.jsx';
import { SearchIcon, ChevronLeftIcon, ChevronRightIcon } from '../components/Icons.jsx';
import { CATEGORIES, JOURNALS } from '../utils.js';

const OPH_TAG = '眼科AI';
const TIER_TABS = [
  { key: '', label: '全部收录' },
  { key: 'primary', label: '🏷️ 指定期刊' },
  { key: 'secondary', label: '✨ 扩展推荐' }
];

export default function Articles() {
  const [searchParams, setSearchParams] = useSearchParams();
  const category = searchParams.get('category') || '';
  const journal = searchParams.get('journal') || '';
  const q = searchParams.get('q') || '';
  const tag = searchParams.get('tag') || '';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));

  const [data, setData] = useState({ items: [], total: 0, pages: 1, page: 1 });
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState(q);
  const [ophReports, setOphReports] = useState([]);
  const [ophGroups, setOphGroups] = useState([]);
  const [tier, setTier] = useState('');
  const isOph = tag === OPH_TAG;

  useEffect(() => {
    setLoading(true);
    api
      .articles({ category, journal, q, tag, page, size: tag === OPH_TAG ? 200 : undefined })
      .then(setData)
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, [category, journal, q, tag, page]);

  useEffect(() => {
    if (isOph) {
      api.ophReports().then((r) => setOphReports(r.items || [])).catch(() => {});
      api.ophJournals().then((j) => setOphGroups(j.groups || [])).catch(() => {});
    }
  }, [isOph]);

  const setParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setSearchParams(next, { replace: true });
  };

  // 普通栏目切换：仅设置 category，清空 tag/q/journal
  const switchTab = (cb) => {
    const next = new URLSearchParams();
    if (cb) next.set('category', cb);
    setSearchParams(next, { replace: true });
    setTier('');
  };
  const switchOph = () => {
    setSearchParams(new URLSearchParams({ tag: OPH_TAG }), { replace: true });
    setTier('');
  };

  const onSearch = (e) => {
    e.preventDefault();
    setParam('q', input.trim());
  };

  const shownItems = isOph && tier
    ? data.items.filter((a) => (tier === 'primary' ? a.ophTier !== 'secondary' : a.ophTier === 'secondary'))
    : data.items;

  return (
    <div className="container">
      <div className="toolbar">
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 26, marginBottom: 16 }}>
          {isOph ? '👁️ 眼科 AI · 每日速递' : '顶刊动态 · 全部资讯'}
        </h1>
        <div className="tabs">
          <button className={`tab ${!category && !isOph ? 'active' : ''}`} onClick={() => switchTab('')}>
            全部
          </button>
          {CATEGORIES.map((c) => (
            <button key={c.key} className={`tab ${category === c.key ? 'active' : ''}`} onClick={() => switchTab(c.key)}>
              {c.label}
            </button>
          ))}
          <button className={`tab ${isOph ? 'active' : ''}`} style={isOph ? undefined : { borderColor: '#0d9488', color: '#0d9488' }} onClick={switchOph}>
            👁️ 眼科AI
          </button>
        </div>
        <div className="filter-row">
          <select value={journal} onChange={(e) => setParam('journal', e.target.value)}>
            <option value="">全部期刊</option>
            {JOURNALS.map((j) => (
              <option key={j} value={j}>{j}</option>
            ))}
          </select>
          <form className="search-box" onSubmit={onSearch}>
            <input
              type="text"
              placeholder="搜索标题 / 关键词 / 标签…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button type="submit" aria-label="搜索"><SearchIcon width={16} height={16} /></button>
          </form>
        </div>
      </div>

      {isOph && (
        <div className="card" style={{ marginBottom: 18, padding: '16px 20px', borderColor: '#bcd9c9', background: 'linear-gradient(135deg, #f2faf6, #e6f4ee)' }}>
          <div className="repo-btns" style={{ marginBottom: 0 }}>
            <b>⏰ 每天早上 8:00 自动收集当天眼科 AI 论文</b>
            <span className="chip chip-soft" style={{ background: '#fff', color: '#0d9488' }}>指定 7 本期刊 + 全库扩展推荐</span>
            <span className="chip chip-soft" style={{ background: '#fff', color: '#b45309' }}>摘要中英对照 · IF 标注 · DOI/PMC 原文</span>
            <span className="chip chip-soft" style={{ background: '#fff', color: '#33463c' }}>共 {data.total} 篇</span>
          </div>
          <div className="field-hint" style={{ marginTop: 10 }}>
            日报文档：
            {ophReports.length === 0 ? (
              <span> 暂无（每日 8:00 自动生成）</span>
            ) : (
              <span>
                {ophReports.slice(0, 3).flatMap((r) =>
                  r.files.map((f) => (
                    <a key={f.path} href={`/api/oph/reports/download?path=${encodeURIComponent(f.path)}`} target="_blank" rel="noreferrer" style={{ color: 'var(--brand-dark)', fontWeight: 700 }}>
                      {r.date} · {f.name.replace('公众号稿', '公众号').replace('网站介绍稿', '网站稿')} ⇣
                    </a>
                  ))
                ).reduce((acc, el, i) => (i === 0 ? [el] : [...acc, <span key={`s${i}`}> · </span>, el]), [])}
              </span>
            )}
            <Link to="/ophthalmology" style={{ marginLeft: 10, color: '#0d9488', fontWeight: 700 }}>分栏总览 →</Link>
          </div>
        </div>
      )}

      {isOph && (
        <div className="tabs" style={{ marginBottom: 12 }}>
          {TIER_TABS.map((t) => (
            <button key={t.key} className={`tab ${tier === t.key ? 'active' : ''}`} onClick={() => setTier(t.key)}>
              {t.label}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="loading">加载中…</div>
      ) : shownItems.length === 0 ? (
        <div className="empty">
          <div className="icon">🔍</div>
          <h3>{isOph ? '暂无符合筛选的眼科 AI 论文' : '没有找到相关内容'}</h3>
          <p>{isOph ? '指定期刊发表眼科 AI 论文频率较低，可切换到「扩展推荐」或稍后刷新。' : '换个关键词或筛选条件试试。'}</p>
        </div>
      ) : (
        <>
          {isOph ? (
            <OphJournalSections items={shownItems} groups={ophGroups} tier={tier} />
          ) : (
            <div className="grid-3">
              {shownItems.map((a) => <ArticleCard key={a.id} article={a} />)}
            </div>
          )}
          {!isOph && data.pages > 1 && (
            <div className="pagination">
              <button className="btn btn-outline btn-sm" disabled={data.page <= 1} onClick={() => setParam('page', String(data.page - 1))}>
                <ChevronLeftIcon width={14} height={14} />上一页
              </button>
              <span className="page-info">第 {data.page} / {data.pages} 页 · 共 {data.total} 篇</span>
              <button className="btn btn-outline btn-sm" disabled={data.page >= data.pages} onClick={() => setParam('page', String(data.page + 1))}>
                下一页<ChevronRightIcon width={14} height={14} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
