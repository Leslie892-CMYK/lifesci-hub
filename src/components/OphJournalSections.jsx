import ArticleCard from './ArticleCard.jsx';

// 按「分组 → 期刊」分区展示眼科 AI 论文
// groups: [{ name, journals: [{ label, ifRef }] }]
export default function OphJournalSections({ items, groups, tier = '' }) {
  const target = items.filter((a) => a.ophTier !== 'secondary');
  const extended = items.filter((a) => a.ophTier === 'secondary');
  const byJournal = (label) => target.filter((a) => a.journal === label);

  const extMap = new Map();
  for (const a of extended) {
    const key = a.journal || '其他';
    if (!extMap.has(key)) extMap.set(key, []);
    extMap.get(key).push(a);
  }
  const extGroups = [...extMap.entries()]
    .map(([label, list]) => ({ label, items: list }))
    .sort((a, b) => b.items.length - a.items.length);

  const showTarget = tier !== 'secondary';
  const showExtended = tier !== 'primary';

  return (
    <div>
      {showTarget &&
        (groups || []).map((g) => (
          <section key={g.name} className="section" style={{ marginTop: 18 }}>
            <div className="journal-group-title">{g.name}</div>
            {g.journals.map((j) => {
              const jItems = byJournal(j.label);
              return (
                <div key={j.label} className="journal-block">
                  <div className="journal-block-head">
                    <span className="journal-block-name">{j.label}</span>
                    {j.ifRef && (
                      <span className="chip chip-soft" style={{ background: '#fdf3e0', color: '#b45309' }}>
                        IF ≈{j.ifRef}
                      </span>
                    )}
                    <span className="journal-block-count">{jItems.length} 篇</span>
                  </div>
                  {jItems.length === 0 ? (
                    <div className="journal-empty">
                      本刊今日暂无眼科 AI 相关论文（系统每日 8:00 自动检索，命中即自动收录）
                    </div>
                  ) : (
                    <div className="grid-3">
                      {jItems.map((a) => <ArticleCard key={a.id} article={a} />)}
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        ))}

      {showExtended && (
        <section className="section" style={{ marginTop: 18 }}>
          <div className="journal-group-title">扩展推荐 · 非目标期刊（仅供参考）</div>
          {extGroups.length === 0 ? (
            <div className="journal-empty">今日暂无其他期刊的眼科 AI 论文。</div>
          ) : (
            extGroups.map((g) => (
              <div key={g.label} className="journal-block">
                <div className="journal-block-head">
                  <span className="journal-block-name">{g.label}</span>
                  <span className="journal-block-count">{g.items.length} 篇</span>
                </div>
                <div className="grid-3">
                  {g.items.map((a) => <ArticleCard key={a.id} article={a} />)}
                </div>
              </div>
            ))
          )}
        </section>
      )}
    </div>
  );
}
