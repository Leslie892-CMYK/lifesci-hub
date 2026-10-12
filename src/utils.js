export const CATEGORIES = [
  { key: 'journal', label: '顶刊文章' },
  { key: 'tech', label: '新兴技术' },
  { key: 'news', label: '学术资讯' }
];
export const CATEGORY_META = Object.fromEntries(CATEGORIES.map((c) => [c.key, c]));

export const JOURNALS = [
  'Nature',
  'Science',
  'Cell',
  'NEJM',
  'The Lancet',
  'Nature Medicine',
  'Nature Biotechnology',
  'Nature Communications',
  'PNAS',
  '其他'
];

export const JOURNAL_COLORS = {
  Nature: '#a61b29',
  Science: '#2f56a5',
  Cell: '#0d9488',
  NEJM: '#1a7f37',
  'The Lancet': '#6b21a8',
  'Nature Medicine': '#be185d',
  'Nature Biotechnology': '#c2410c',
  'Nature Communications': '#475569',
  PNAS: '#334155',
  其他: '#64748b'
};

export const POST_TYPES = [
  { key: 'discussion', label: '讨论交流', icon: '💬' },
  { key: 'recruit_teammate', label: '招募队友', icon: '🤝' },
  { key: 'recruit_member', label: '招募成员', icon: '🧑‍🔬' },
  { key: 'resource', label: '资源分享', icon: '📚' }
];
export const POST_TYPE_META = Object.fromEntries(POST_TYPES.map((t) => [t.key, t]));

export const POST_TYPE_COLORS = {
  discussion: '#0f8a5f',
  recruit_teammate: '#c2410c',
  recruit_member: '#1d4ed8',
  resource: '#7c3aed'
};

export const COMMUNITY_TYPES = [
  { key: 'general', label: '兴趣交流' },
  { key: 'competition', label: '竞赛组队' },
  { key: 'recruitment', label: '团队招募' }
];
export const COMMUNITY_TYPE_META = Object.fromEntries(COMMUNITY_TYPES.map((t) => [t.key, t]));

export const COMMUNITY_COLORS = ['#0f8a5f', '#2563eb', '#7c3aed', '#ea580c', '#db2777', '#0d9488'];

export const REPO_TYPES = [
  { key: 'mcp', label: 'MCP 服务器', icon: '🔌' },
  { key: 'skill', label: 'Agent Skill', icon: '🧩' }
];
export const REPO_TYPE_META = Object.fromEntries(REPO_TYPES.map((t) => [t.key, t]));

export const REPO_CATEGORIES = ['文献检索', '文献管理', '数据采集', '论文写作', '通用效率', '合集导航'];
export const REPO_CATEGORY_META = Object.fromEntries(
  [
    ['文献检索', { label: '文献检索', icon: '🔍' }],
    ['文献管理', { label: '文献管理', icon: '📚' }],
    ['数据采集', { label: '数据采集', icon: '🕷️' }],
    ['论文写作', { label: '论文写作', icon: '✍️' }],
    ['通用效率', { label: '通用效率', icon: '⚡' }],
    ['合集导航', { label: '合集导航', icon: '🗂️' }]
  ].map(([k, v]) => [k, { ...v, key: k }])
);

export function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '刚刚';
  if (m < 60) return `${m} 分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} 小时前`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} 天前`;
  return fmtDate(iso);
}

export function fmtDate(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function fmtDateTime(iso) {
  const d = new Date(iso);
  return `${fmtDate(iso)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function renderParagraphs(text) {
  return String(text || '')
    .split(/\n\n+/)
    .map((block) => block.trim())
    .filter(Boolean);
}

// ---------- 比赛动态 ----------
export const COMPETITION_LEVELS = ['A类', 'B类', 'C类', '校级', '待认定'];
export const COMPETITION_LEVEL_COLORS = {
  'A类': '#b45309',
  'B类': '#64748b',
  'C类': '#a16207',
  '校级': '#0f766e',
  '待认定': '#94a3b8'
};
export const COMPETITION_STATUSES = ['报名中', '进行中', '即将截止', '已结束'];
export const COMPETITION_STATUS_COLORS = {
  '报名中': '#0f8a5f',
  '进行中': '#2563eb',
  '即将截止': '#c2410c',
  '已结束': '#94a3b8'
};
export const COMPETITION_TYPES = ['学科竞赛', '创新创业', '科研训练', '其他'];
export const COMPETITION_NATION_LEVELS = ['国家级', '省级', '国际级', '校级'];

export function daysLeft(deadline) {
  if (!deadline) return null;
  const target = new Date(String(deadline));
  if (Number.isNaN(target.getTime())) return null;
  const days = Math.ceil((target.getTime() - Date.now()) / 86400000);
  if (days < 0) return '已截止';
  if (days === 0) return '今天截止';
  return `还剩 ${days} 天`;
}

// ---------- OpenMedAI 协作模块 ----------
export const OM_DIRECTIONS = ['医学影像AI', '医疗NLP', 'AI药物发现', '知识工程', '组学数据', '临床AI', '其他'];
export const OM_STATUSES = ['招募中', '进行中', '已完成'];
export const OM_STATUS_COLORS = { 招募中: '#0f8a5f', 进行中: '#2563eb', 已完成: '#94a3b8' };
export const OM_ROLES = [
  '医生', '学生', '大学老师', 'Leader', 'AI工程师', '医学统计',
  '文献整理', '数据处理', '论文写作', '资助者', '其他'
];
export const OM_AUTHORSHIP = [
  { key: 'no_interest', label: '对署名没有兴趣' },
  { key: 'contribution', label: '普通参与，按贡献' },
  { key: 'co_first_or_corresponding', label: '主要参与，共同一作/共同通讯' },
  { key: 'first_non_primary_unit', label: '主要参与，一作非一单位可' },
  { key: 'first_primary_unit', label: '主要参与，一作一单位' }
];
export const OM_AUTHORSHIP_LABEL = Object.fromEntries(OM_AUTHORSHIP.map((a) => [a.key, a.label]));
export const OM_CLAIM_TYPES = [
  { key: 'leader', label: '认领项目负责人' },
  { key: 'paper_first_unit', label: '认领课题（论文第一单位）' },
  { key: 'experiment', label: '认领实验' },
  { key: 'literature', label: '认领文献整理' },
  { key: 'data', label: '认领数据处理' },
  { key: 'model', label: '认领模型实现' },
  { key: 'writing', label: '认领论文写作' },
  { key: 'medical_review', label: '认领医学审核' }
];
export const OM_CLAIM_TYPE_LABEL = Object.fromEntries(OM_CLAIM_TYPES.map((c) => [c.key, c.label]));
export const OM_SPONSOR_TYPES = [
  { key: 'funding', label: '资助经费' },
  { key: 'credits', label: '注入积分池' },
  { key: 'compute', label: '资助算力' },
  { key: 'token', label: '资助 token' },
  { key: 'labor_fee', label: '资助劳务费' },
  { key: 'data_budget', label: '数据整理预算' },
  { key: 'label_budget', label: '标注预算' },
  { key: 'expert', label: '专家咨询' },
  { key: 'student_labor', label: '学生劳务' },
  { key: 'publication_fee', label: '论文版面费' },
  { key: 'other', label: '其他' }
];
export const OM_SPONSOR_TYPE_LABEL = Object.fromEntries(OM_SPONSOR_TYPES.map((s) => [s.key, s.label]));

// ---------- 学术前沿 ----------
export const FRONTIER_DIRECTIONS = [
  {
    key: 'tumor',
    label: '肿瘤免疫',
    icon: '🛡️',
    desc: '肿瘤微环境、细胞治疗与免疫检查点研究的最新进展与解读。',
    tags: ['肿瘤免疫', 'CAR-T', 'mRNA', '个性化医疗']
  },
  {
    key: 'neuro',
    label: '神经科学',
    icon: '🧠',
    desc: '脑图谱、神经环路与神经退行性疾病机制前沿。',
    tags: ['神经科学', '空间转录组', '脑图谱']
  },
  {
    key: 'gene',
    label: '基因编辑',
    icon: '✂️',
    desc: 'CRISPR 家族、碱基编辑与基因治疗临床转化进展。',
    tags: ['基因编辑', 'CRISPR', '血液病', '临床试验']
  },
  {
    key: 'synbio',
    label: '合成生物学',
    icon: '🧬',
    desc: '基因线路设计、DNA 合成与生物制造新范式。',
    tags: ['合成生物学', 'DNA 合成', '生物制造', 'iGEM']
  },
  {
    key: 'ai-drug',
    label: 'AI 与药物发现',
    icon: '🤖',
    desc: '结构预测、分子对接与生成式 AI 驱动的药物研发。',
    tags: ['人工智能', '药物发现', '结构生物学', '冷冻电镜']
  },
  {
    key: 'single-cell',
    label: '单细胞与组学',
    icon: '🔬',
    desc: '单细胞、空间组学与多组学整合分析趋势。',
    tags: ['单细胞测序', '多组学', '表观遗传']
  }
];
