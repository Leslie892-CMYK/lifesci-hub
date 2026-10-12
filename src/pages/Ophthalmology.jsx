import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import OphJournalSections from '../components/OphJournalSections.jsx';

const TIERS = [
  { key: '', label: '全部' },
  { key: 'primary', label: '🏷️ 目标期刊（19 本）' },
  { key: 'secondary', label: '✨ 扩展推荐' }
];

export default function Ophthalmology() {
  const [items, setItems] = useState([]);
  const [groups, setGroups] = useState([]);
  const [journalNote, setJournalNote] = useState('');
  const [reports, setReports] = useState([]);
  const [tier, setTier] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.articles({ tag: '眼科AI', size: 200 }), api.ophJournals(), api.ophReports()])
      .then(([a, j, r]) => {
        setItems(a.items || []);
        setGroups(j.groups || []);
        setJournalNote(j.note || '');
        setReports(r.items || []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const download = (path) => `/api/oph/reports/download?path=${encodeURIComponent(path)}`;

  return (
    <div className="container">
      <div className="recruit-head card">
        <h1>👁️ 眼科 AI · 按期刊分区总览</h1>
        <p>
          每天早上 <b>8:00 自动检索当天发表</b>的眼科 AI 论文：<b>目标期刊 19 本</b>每本独立分区展示，
          其他期刊归入「扩展推荐（仅供参考）」。每篇显示<b>中文标题（上）+ 英文原题（下）</b>、
          中文摘要与 English Abstract、DOIC/PMC 原文链接。
        </p>
        <div className="repo-btns" style={{ marginTop: 14, marginBottom: 0 }}>
          <span className="chip chip-tech">每日 8:00 自动更新</span>
          <span className="chip repo-cat">共 {items.length} 篇</span>
          <span className="chip chip-soft">目标期刊 {items.filter((a) => a.ophTier !== 'secondary').length} 篇</span>
          <span className="chip chip-soft">扩展推荐 {items.filter((a) => a.ophTier === 'secondary').length} 篇</span>
        </div>
        <p className="field-hint" style={{ marginTop: 12 }}>
          影响因子为参考值（≈），以期刊官方/JCR 为准{journalNote ? `｜${journalNote}` : ''}
        </p>
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="detail-layout" style={{ marginTop: 18 }}>
        <div>
          <div className="tabs">
            {TIERS.map((t) => (
              <button key={t.key} className={`tab ${tier === t.key ? 'active' : ''}`} onClick={() => setTier(t.key)}>
                {t.label}
              </button>
            ))}
          </div>
          {loading ? (
            <div className="loading">加载中…</div>
          ) : items.length === 0 ? (
            <div className="empty">
              <div className="icon">👁️</div>
              <h3>暂无收录</h3>
              <p>系统每日 8:00 自动检索目标期刊的眼科 AI 论文，命中后会自动出现在这里。</p>
            </div>
          ) : (
            <OphJournalSections items={items} groups={groups} tier={tier} />
          )}
        </div>

        <aside className="detail-side">
          <div className="card aside-card">
            <div className="aside-title">📄 日报文档下载</div>
            {reports.length === 0 ? (
              <p className="field-hint" style={{ margin: 0 }}>暂无报告（每日 8:00 自动生成）</p>
            ) : (
              reports.map((r) => (
                <div key={r.date} style={{ marginBottom: 10 }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>{r.date}</div>
                  {r.files.map((f) => (
                    <a key={f.path} href={download(f.path)} target="_blank" rel="noreferrer" className="aside-item">
                      <span className="aside-item-title">📄 {f.name}</span>
                      <span className="aside-item-meta">{(f.size / 1024).toFixed(0)}KB</span>
                    </a>
                  ))}
                </div>
              ))
            )}
            <p className="field-hint" style={{ margin: '10px 0 0' }}>
              文档按「分组 → 期刊」分区，无文章的期刊标注空状态；每篇中文标题在上、英文原题在下。
            </p>
          </div>
          <div className="card aside-card">
            <div className="aside-title">🔍 检索范围</div>
            <p className="field-hint" style={{ margin: 0 }}>
              目标期刊 19 本（CNS 正刊 3 + 综合类子刊 7 + 医学综合与数字健康 6 + 眼科专科顶刊 3）。<br />
              主题仍限定「眼科 × AI」，不等于收录这些期刊的全部文章。
            </p>
          </div>
          <div className="card aside-card">
            <div className="aside-title">🧭 相关入口</div>
            <Link to="/articles?tag=眼科AI" className="aside-item">
              <span className="aside-item-title">在「顶刊动态」中查看</span><span className="aside-item-meta">→</span>
            </Link>
            <Link to="/articles" className="aside-item">
              <span className="aside-item-title">全部顶刊文章</span><span className="aside-item-meta">→</span>
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
