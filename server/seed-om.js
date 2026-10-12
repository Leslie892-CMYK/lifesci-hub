// OpenMedAI 医学 AI 协作模块 —— 数据模型与种子
// 字段对齐 openmedailab-platform（Django interactions 应用）：
// 分工意向 ParticipationRole / 排名意向 AuthorshipIntent / 认领 ClaimType / 资助 SponsorType / 状态 InteractionStatus

export const OM_ROLES = [
  '医生',
  '学生',
  '大学老师',
  'Leader',
  'AI工程师',
  '医学统计',
  '文献整理',
  '数据处理',
  '论文写作',
  '资助者',
  '其他'
];

export const OM_AUTHORSHIP = [
  { key: 'no_interest', label: '对署名没有兴趣' },
  { key: 'contribution', label: '普通参与，按贡献' },
  { key: 'co_first_or_corresponding', label: '主要参与，共同一作/共同通讯' },
  { key: 'first_non_primary_unit', label: '主要参与，一作非一单位可' },
  { key: 'first_primary_unit', label: '主要参与，一作一单位' }
];

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

const U = {
  admin: 'admin',
  editor: 'editor',
  synbio_li: 'synbio_li',
  bio_wang: 'bio_wang',
  lab_zhang: 'lab_zhang',
  wetlab_chen: 'wetlab_chen'
};

export function omSeedData() {
  const topics = [
    {
      title: '多模态医学影像智能诊断',
      direction: '医学影像AI',
      owner: U.synbio_li,
      status: '招募中',
      description:
        '融合 CT、MRI 与病理图像的辅助诊断模型研究，目标是构建面向常见胸部疾病的多模态融合诊断管线，并产出可复用的开源基准。',
      deliverables:
        '数据预处理脚本、多模态融合模型与训练代码、实验报告；鼓励产出论文并共同署名。',
      tags: ['医学影像', '多模态', '深度学习'],
      views: 320,
      createdAt: '2026-08-28T08:30:00.000Z'
    },
    {
      title: '基于大模型的电子病历信息抽取',
      direction: '医疗NLP',
      owner: U.bio_wang,
      status: '进行中',
      description:
        '利用 LLM 对电子病历进行结构化信息抽取（症状、用药、检验值、诊疗事件），重点研究长文本切分与实体对齐，构建院内评测集。',
      deliverables: '抽取流水线代码、评测脚本、标注指南；团队内共享，可申请进组继续研究。',
      tags: ['医疗NLP', '电子病历', '大模型'],
      views: 268,
      createdAt: '2026-08-26T09:00:00.000Z'
    },
    {
      title: '蛋白质结构预测与药物重定位',
      direction: 'AI药物发现',
      owner: U.lab_zhang,
      status: '招募中',
      description:
        '结合 AlphaFold3 结构预测与大规模药物-靶点相互作用数据，对已有药物进行老药新用（重定位）筛选，优先关注神经退行性疾病靶点。',
      deliverables: '筛选方法论文档、候选药物清单、结构可视化；欢迎生信与药理方向同学协作。',
      tags: ['结构生物学', '分子对接', '药物重定位'],
      views: 410,
      createdAt: '2026-08-24T11:00:00.000Z'
    },
    {
      title: '医学知识图谱构建与知识问答',
      direction: '知识工程',
      owner: U.wetlab_chen,
      status: '招募中',
      description:
        '从指南与教材中抽取实体关系，构建医学知识图谱，并基于图谱 + RAG 实现面向学生的医学问答助手，目标是覆盖诊断学核心章节。',
      deliverables: '图谱 Schema 与构建脚本、问答 Demo、评测报告。',
      tags: ['知识图谱', '知识问答', 'RAG'],
      views: 190,
      createdAt: '2026-08-22T14:00:00.000Z'
    },
    {
      title: '单细胞图谱在癌种分型中的应用',
      direction: '组学数据',
      owner: U.bio_wang,
      status: '进行中',
      description:
        '基于公共单细胞数据集构建肿瘤免疫微环境图谱，用于癌种分型与免疫治疗表型预测，寻找跨癌种一致性特征。',
      deliverables: '分型流程（Seurat/scVI）、特征集与图表；适合生信同学练手与产出第二作者成果。',
      tags: ['单细胞测序', '肿瘤分型', '多组学'],
      views: 356,
      createdAt: '2026-08-20T10:00:00.000Z'
    },
    {
      title: '临床决策支持系统综述与评测基准',
      direction: '临床AI',
      owner: U.admin,
      status: '已完成',
      description:
        '系统梳理 CDSS 研究现状，并设计面向高年级医学生的评测任务集（诊断推理、用药建议），已完成第一轮综述与基线评测。',
      deliverables: '综述初稿（已归档）、评测任务集与基线结果；新同学可基于此开展下一轮扩展。',
      tags: ['CDSS', '评测基准', '医学教育'],
      views: 168,
      createdAt: '2026-08-16T09:00:00.000Z'
    }
  ];

  const participations = [
    // topic, user, role, hoursPerWeek, authorshipIntent, status
    { topic: 0, user: U.lab_zhang, role: 'AI工程师', hours: 12, authorship: 'co_first_or_corresponding', status: 'approved', note: '有医学影像分割实战经验，可负责模型实现。' },
    { topic: 0, user: U.bio_wang, role: '数据处理', hours: 8, authorship: 'contribution', status: 'pending', note: '熟悉 DICOM 与 PACS 数据流程，愿意做数据清洗。' },
    { topic: 1, user: U.synbio_li, role: 'AI工程师', hours: 10, authorship: 'contribution', status: 'approved', note: 'LLM 微调与评测经验，负责抽取流水线。' },
    { topic: 1, user: U.wetlab_chen, role: '文献整理', hours: 6, authorship: 'no_interest', status: 'pending', note: '可以整理标注规范与评测文献。' },
    { topic: 2, user: U.bio_wang, role: '医学统计', hours: 6, authorship: 'co_first_or_corresponding', status: 'approved', note: '熟悉药物-靶点公共数据库与筛选统计。' },
    { topic: 2, user: U.synbio_li, role: '论文写作', hours: 4, authorship: 'contribution', status: 'pending', note: '希望参与论文写作部分。' },
    { topic: 3, user: U.admin, role: 'Leader', hours: 10, authorship: 'co_first_or_corresponding', status: 'approved', note: '知识图谱与 RAG 的工程经验。' },
    { topic: 4, user: U.wetlab_chen, role: '数据处理', hours: 10, authorship: 'contribution', status: 'approved', note: '负责单细胞流程与图表产出。' },
    { topic: 5, user: U.lab_zhang, role: '文献整理', hours: 3, authorship: 'no_interest', status: 'approved', note: '完成综述章节校对。' }
  ];

  const claims = [
    // topic, user, claimType, status
    { topic: 0, user: U.wetlab_chen, claimType: 'model', status: 'approved', note: '认领模型实现（分割模块）。' },
    { topic: 1, user: U.lab_zhang, claimType: 'data', status: 'pending', note: '认领数据处理（去标识化）。' },
    { topic: 3, user: U.lab_zhang, claimType: 'writing', status: 'approved', note: '认领论文写作（评测报告）。' },
    { topic: 4, user: U.admin, claimType: 'data', status: 'pending', note: '认领数据处理（批次校正）。' }
  ];

  const sponsors = [
    // topic, user, sponsorType, status
    { topic: 1, user: U.admin, sponsorType: 'compute', status: 'approved', note: '提供 1000 卡时算力用于微调。' },
    { topic: 2, user: U.synbio_li, sponsorType: 'expert', status: 'pending', note: '可约专家咨询（药理方向）。' }
  ];

  const scores = [
    // topic, user, score(1-10)
    { topic: 0, user: U.bio_wang, score: 9 },
    { topic: 0, user: U.admin, score: 8 },
    { topic: 1, user: U.synbio_li, score: 9 },
    { topic: 2, user: U.synbio_li, score: 9 },
    { topic: 4, user: U.lab_zhang, score: 8 },
    { topic: 4, user: U.admin, score: 7 },
    { topic: 5, user: U.bio_wang, score: 8 }
  ];

  const follows = [
    { topic: 0, user: U.admin },
    { topic: 2, user: U.synbio_li },
    { topic: 3, user: U.lab_zhang },
    { topic: 4, user: U.admin },
    { topic: 4, user: U.lab_zhang },
    { topic: 5, user: U.bio_wang }
  ];

  return { topics, participations, claims, sponsors, scores, follows };
}
