// 演示种子数据：首次启动时写入 data/db.json
// 内容为演示用途的示例资讯，日期相对当前时间生成，保证「今日速递」始终有内容。
import { hashPassword } from './auth.js';
import { COMPETITION_HUB, competitionEntries } from './seed-competitions.js';
import { omSeedData } from './seed-om.js';

function daysAgo(days, hour = 10, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export function buildSeed({ publicMode = false } = {}) {
  let seq = 1;
  const N = () => seq++;

  // ---------- 用户 ----------
  const users = [
    { id: N(), username: 'admin', passwordHash: hashPassword('admin123'), role: 'admin', bio: '本站管理员，负责内容审核与社区运营。', color: '#0f8a5f', createdAt: daysAgo(60) },
    { id: N(), username: 'editor', passwordHash: hashPassword('editor123'), role: 'editor', bio: '前沿编辑，每日追踪 Nature / Science / Cell 最新发表。', color: '#2563eb', createdAt: daysAgo(55) },
    { id: N(), username: 'synbio_li', passwordHash: hashPassword('123456'), role: 'user', bio: 'iGEM 老兵 · 合成生物学研二，常年组队中。', color: '#7c3aed', createdAt: daysAgo(40) },
    { id: N(), username: 'bio_wang', passwordHash: hashPassword('123456'), role: 'user', bio: '生信搬砖人，单细胞 & 空间转录组。', color: '#ea580c', createdAt: daysAgo(35) },
    { id: N(), username: 'lab_zhang', passwordHash: hashPassword('123456'), role: 'user', bio: '神经科学 PhD，专注文献与科研方法分享。', color: '#db2777', createdAt: daysAgo(30) },
    { id: N(), username: 'wetlab_chen', passwordHash: hashPassword('123456'), role: 'user', bio: '蛋白实验员，WB / 纯化 / 结构生物学。', color: '#0d9488', createdAt: daysAgo(28) }
  ];
  const [admin, editor, synbioLi, bioWang, labZhang, wetlabChen] = users;

  // ---------- 文章 ----------
  const articles = [
    {
      id: N(),
      title: 'AlphaFold3 发布：AI 实现生物分子复合物结构的高精度预测',
      summary: 'DeepMind 团队在《Nature》发表 AlphaFold3，将结构预测从单一蛋白质扩展到蛋白质-核酸、蛋白质-小分子复合物，并在药物结合位点预测上达到实验级精度。',
      content:
        '英国 DeepMind 与 Isomorphic Labs 联合团队在《Nature》发表新一代人工智能结构预测模型 AlphaFold3。与此前版本不同，AlphaFold3 不再局限于单链蛋白质，而是可以端到端地预测由蛋白质、DNA、RNA、小分子配体、离子及翻译后修饰共同构成的生物分子复合物三维结构。\n\n在多项基准测试中，AlphaFold3 对蛋白质-配体复合物的预测精度较传统分子对接方法提升约 50%，对蛋白质-核酸复合物的预测也显著优于领域专用工具。研究团队指出，这一能力有望大幅缩短先导化合物优化与药物靶点验证的周期。\n\n论文同步公布了 AlphaFold Server 开放服务，全球科研人员可免费提交序列并获得预测结果。多位结构生物学家评论称，「结构预测正在从结构生物学家的专业工具，演变为整个生命科学的基础设施」。\n\n值得注意的是，模型对动态构象与别构调控的刻画仍有局限，作者建议将预测结果与冷冻电镜、晶体学实验数据结合使用。',
      category: 'journal',
      journal: 'Nature',
      tags: ['结构生物学', '人工智能', '药物发现'],
      authors: 'J. Abramson, J. Adler, et al.',
      doi: '10.1038/s41586-024-07487-w',
      publishedAt: daysAgo(0, 8),
      authorId: editor.id,
      views: 2840
    },
    {
      id: N(),
      title: '2026 iGEM 赛季正式启动：注册通道、时间线与组队指南一览',
      summary: 'iGEM 2026 赛季已开放注册。本文整理了关键时间节点、费用说明以及官方推荐的组队与培训资源，供新老队伍参考。',
      content:
        'iGEM 2026 赛季已正式开放注册，常规注册通道将持续至 2026 年 3 月底。与往年相比，本赛季在赛道设置、安全审查与评审标准上有小幅更新，组委会发布了新的竞赛手册。\n\n关键时间线：3 月常规注册截止、6 月项目冻结（Freeze）前提交安全表格、10 月底 Grand Jamboree 全球总决赛。官方同时开放了建模、人类实践（HP）与 Wiki 的免费培训资源。\n\n对于新队伍，官方建议尽早完成队员招募与主题 brainstorm，并积极参与 5 月的地区 Meetup。本站「iGEM 竞赛组队」社区整理了历年参赛经验与组队信息，欢迎访问。',
      category: 'news',
      journal: '',
      tags: ['竞赛', 'iGEM', '组队'],
      authors: '本站编辑部',
      doi: '',
      publishedAt: daysAgo(0, 7),
      authorId: admin.id,
      views: 1520
    },
    {
      id: N(),
      title: '碱基编辑疗法让多名镰状细胞贫血患者脱离输血依赖',
      summary: '《Science》刊发的临床随访显示，基于腺嘌呤碱基编辑的造血干细胞疗法在多例镰状细胞贫血患者中实现持续一年的正常血红蛋白表达。',
      content:
        '《Science》刊发的一项多中心临床随访显示，基于腺嘌呤碱基编辑（ABE）的自体造血干细胞疗法，在多例镰状细胞贫血患者中实现了持续一年以上的正常胎儿血红蛋白表达，患者全部脱离输血依赖。\n\n该疗法通过电穿孔将碱基编辑器递送至患者造血干细胞，在 BCL11A 增强子位点引入单碱基突变，从而重新激活胎儿血红蛋白表达，避免了传统 CRISPR-Cas9 双链断裂带来的大片段缺失风险。\n\n随访期内未观察到与编辑相关的严重不良事件，脱靶分析显示编辑高度特异。研究团队表示，下一步将扩大样本量并延长随访，评估该策略在 β-地中海贫血等其他血红蛋白病中的适用性。',
      category: 'journal',
      journal: 'Science',
      tags: ['基因编辑', '血液病', '临床试验'],
      authors: 'R. Sharma, et al.',
      doi: '10.1126/science.adn0227',
      publishedAt: daysAgo(1, 9),
      authorId: editor.id,
      views: 1735
    },
    {
      id: N(),
      title: '多器官微生理系统进入监管视野：类器官芯片如何加速药物毒性评估',
      summary: '集肝、心、肾于一体的多器官芯片系统在最新合作研究中展现出优于传统动物实验的毒性预测能力，多国药监机构已启动相关验证项目。',
      content:
        '集成肝、心、肾与肠道模块的多器官微生理系统（MPS）在最新合作研究中，展现出优于传统动物实验的候选药物毒性预测能力，尤其在人特异性毒性（如胆汁淤积、心脏 QT 间期延长）识别方面优势明显。\n\n该系统利用微流控将多个类器官模块通过仿生循环串联，可连续培养数周并实时监测代谢物与生物标志物。欧盟与美国 FDA 已分别启动针对 MPS 数据的监管验证项目，评估其在药物安全性评价中的合规地位。\n\n业内预计，未来五年类器官芯片将在药物研发中承担更多「预筛」角色，与动物实验形成互补而非完全替代，从而降低临床前阶段的失败率与研发成本。',
      category: 'tech',
      journal: 'Nature Biotechnology',
      tags: ['类器官', '微流控', '药物研发'],
      authors: '编辑组编译',
      doi: '',
      publishedAt: daysAgo(1, 14),
      authorId: editor.id,
      views: 1240
    },
    {
      id: N(),
      title: '单细胞与空间转录组联合图谱揭示人类大脑发育的动态蓝图',
      summary: '研究团队结合单细胞 RNA 测序与空间转录组技术，构建了覆盖孕中期到成年的跨阶段人类大脑发育图谱，定位了数百种细胞类型与关键神经发生微环境。',
      content:
        '研究团队整合单细胞 RNA 测序与空间转录组技术，构建了覆盖孕中期、新生儿期到成年期的跨阶段人类大脑发育图谱，系统定位了数百种细胞类型及其空间分布。\n\n图谱首次在空间维度解析了神经发生微环境的动态变化，包括放射状胶质细胞、中间祖细胞与新生神经元之间的信号互作网络，并鉴定出多个与神经发育疾病风险基因富集的细胞状态。\n\n该数据已开放访问。作者希望它能成为神经科学领域的共享参考图谱，助力脑发育机制与神经发育障碍研究。',
      category: 'journal',
      journal: 'Cell',
      tags: ['空间转录组', '神经科学', '单细胞测序'],
      authors: 'L. Chen, et al.',
      doi: '10.1016/j.cell.2024.05.010',
      publishedAt: daysAgo(2, 9),
      authorId: editor.id,
      views: 1520
    },
    {
      id: N(),
      title: '冷冻电镜遇上 AI：原子分辨率解析动态蛋白质机器成为新常态',
      summary: '冷冻电镜与 AI 图像重建的深度结合，正把单颗粒分析的常规分辨率推进到 2 Å 以内，动态蛋白质机器的结构解析进入新阶段。',
      content:
        '冷冻电镜与 AI 图像重建的深度结合，正把单颗粒分析的常规分辨率推进到 2 Å 以内，动态蛋白质机器、膜蛋白复合物与核糖体翻译中间态的结构解析成为「新常态」。\n\n新一代直接电子探测器与基于深度学习的运动校正、颗粒挑选算法，使数据采集通量提升数倍；多家机构已建成每天可解析多个高分辨率结构的自动化管线，从制样到原子模型的时间缩短到一周以内。\n\n专家指出，冷冻电镜正从「静态结构测定」走向「时间分辨的结构生物学」，未来与分子动力学模拟、AlphaFold 预测的结合将揭示更多构象动态与别构调控机制。',
      category: 'tech',
      journal: '',
      tags: ['冷冻电镜', '结构生物学', '人工智能'],
      authors: '编辑组编译',
      doi: '',
      publishedAt: daysAgo(2, 15),
      authorId: editor.id,
      views: 1105
    },
    {
      id: N(),
      title: 'SELECT 试验三年随访：司美格鲁肽显著降低肥胖患者心血管事件风险',
      summary: '《NEJM》发表的 SELECT 试验三年随访结果证实，GLP-1 受体激动剂在非糖尿病肥胖合并心血管疾病患者中持续降低主要不良心血管事件风险达 20%。',
      content:
        '《新英格兰医学杂志》发表的 SELECT 试验三年随访结果显示，在非糖尿病肥胖合并心血管疾病的患者中，每周一次司美格鲁肽 2.4 mg 使主要不良心血管事件风险持续降低 20%。\n\n亚组分析表明，获益独立于基线体重降幅，提示 GLP-1 受体激动剂的心血管保护作用可能存在减重之外的直接机制，如对血管内皮与炎症通路的调控。\n\n同期述评指出，该结果为「肥胖作为心血管疾病可干预危险因素」提供了最高等级证据，或将推动代谢药物进入心血管疾病一级与二级预防指南。',
      category: 'journal',
      journal: 'NEJM',
      tags: ['代谢', '临床研究', '心血管'],
      authors: 'A. M. Lincoff, et al.',
      doi: '10.1056/NEJMoa2307563',
      publishedAt: daysAgo(3, 8),
      authorId: editor.id,
      views: 987
    },
    {
      id: N(),
      title: '单细胞多组学技术路线图：同一细胞同步读取转录组与表观组',
      summary: '同一细胞同步读取转录组与染色质可及性的单细胞多组学方案日趋成熟，最新方案已可处理百万级细胞，并扩展到甲基化与表面蛋白联合检测。',
      content:
        '同一细胞同步读取转录组与染色质可及性的单细胞多组学技术路线日趋成熟，最新商业方案已可在单次实验中处理百万级细胞，并进一步扩展到 DNA 甲基化与蛋白表面标志物的联合检测。\n\n多组学联合分析正在改变细胞状态的定义方式：研究者可以同时看到「基因表达了什么」与「哪些调控元件被打开」，从而更可靠地重建发育轨迹、推断基因调控网络与疾病进程。\n\n最新综述同时指出了关键挑战：多模态数据的整合算法、批次效应校正以及测序深度的平衡，仍是限制其大规模应用的瓶颈。',
      category: 'tech',
      journal: '',
      tags: ['单细胞测序', '多组学', '表观遗传'],
      authors: '编辑组编译',
      doi: '',
      publishedAt: daysAgo(3, 16),
      authorId: editor.id,
      views: 980
    },
    {
      id: N(),
      title: '个性化 mRNA 癌症疫苗 III 期结果：黑色素瘤无复发生存率大幅提升',
      summary: '个性化 mRNA 新抗原癌症疫苗的 III 期临床试验结果在《Nature Medicine》发表：高危黑色素瘤患者无复发生存率提升至接近 80%。',
      content:
        '个性化 mRNA 新抗原癌症疫苗的 III 期临床试验结果在《Nature Medicine》发表：在已切除的高危黑色素瘤患者中，疫苗联合免疫检查点抑制剂将无复发生存率提升至接近 80%。\n\n该疫苗根据每位患者肿瘤的体细胞突变定制，编码多达 34 个新抗原表位，制备周期约 6 周。试验入组患者跨越多个国家与医疗中心，代表性较好。\n\n专家评论认为，这一结果标志着「一人一苗」的个体化肿瘤免疫治疗从概念验证走向规模化临床。成本与生产周期仍是其普及的主要瓶颈，通用型肿瘤抗原疫苗被视为互补路径。',
      category: 'journal',
      journal: 'Nature Medicine',
      tags: ['mRNA', '肿瘤免疫', '个性化医疗'],
      authors: 'J. S. Weber, et al.',
      doi: '10.1038/s41591-024-02951-2',
      publishedAt: daysAgo(4, 9),
      authorId: editor.id,
      views: 856
    },
    {
      id: N(),
      title: '大片段 DNA 合成成本十年下降近万倍，合成基因组计划提速',
      summary: '过去十年大片段 DNA 合成成本下降近万倍，酶法合成与芯片式并行合成推动合成基因组计划提速。',
      content:
        '过去十年，大片段 DNA 合成成本下降近万倍，长度与保真度持续提升，直接推动了合成基因组计划（如 Sc2.0 与 GP-write）的提速。\n\n酶法合成与芯片式并行合成正在取代传统亚磷酰胺化学法，商业化合成服务的价格已进入「每碱基对美分级」时代，数千碱基片段一周内交付成为常态。\n\n业内预计，低成本 DNA 合成将成为合成生物学、DNA 数据存储与疫苗/抗体快速开发的通用底座。与此同时，相关的生物安全治理框架与序列筛查机制也在同步完善。',
      category: 'tech',
      journal: '',
      tags: ['合成生物学', 'DNA 合成', '生物制造'],
      authors: '编辑组编译',
      doi: '',
      publishedAt: daysAgo(4, 15),
      authorId: editor.id,
      views: 760
    },
    {
      id: N(),
      title: '首个通用型实体瘤 CAR-T 早期临床结果积极，安全性可控',
      summary: '《The Lancet》刊发首个通用型实体瘤 CAR-T 疗法的早期临床试验结果：在复发难治性晚期实体瘤中观察到可评估的抗肿瘤活性。',
      content:
        '《The Lancet》刊发首个通用型实体瘤 CAR-T 疗法的早期临床试验结果：在复发难治性晚期卵巢癌与胰腺癌患者中观察到可评估的抗肿瘤活性，且未出现严重细胞因子释放综合征。\n\n该通用型 CAR-T 基于健康供体细胞制备，通过基因编辑敲除内源性 TCR 与 HLA 分子，以降低移植物抗宿主反应与排异风险，有望实现「现货型」细胞治疗，摆脱自体 CAR-T 漫长的制备周期。\n\n研究者同时提示，实体瘤微环境仍是疗效的主要障碍。联合趋化因子改造与免疫微环境调控（如溶瘤病毒、肿瘤微环境重塑抗体）是后续临床方向。',
      category: 'journal',
      journal: 'The Lancet',
      tags: ['CAR-T', '肿瘤免疫', '细胞治疗'],
      authors: 'M. Pule, et al.',
      doi: '10.1016/S0140-6736(24)00999-0',
      publishedAt: daysAgo(5, 8),
      authorId: editor.id,
      views: 640
    },
    {
      id: N(),
      title: '国家自然科学基金 2025 年度项目申请指南发布，生命科学部资助格局微调',
      summary: '国家自然科学基金委发布 2025 年度申请指南：生命科学部继续分类评审，交叉科学部增设「生命健康交叉」专项。',
      content:
        '国家自然科学基金委员会发布 2025 年度项目申请指南。生命科学部继续实行分类评审，面上、青年项目资助强度保持稳定，交叉科学部增设「生命健康交叉」专项。\n\n与上一年度相比，青年科学基金项目对女性申请人的年龄限制放宽至 40 周岁，杰青项目延续「临床医师科学家」倾斜政策。\n\n指南同时提醒申请人注意科研诚信与伦理审查要求：涉及人类遗传资源、实验动物与高致病性病原微生物的研究，须提前完成相关审批方可提交申请。',
      category: 'news',
      journal: '',
      tags: ['基金', '科研政策', '申请指南'],
      authors: '本站编辑部',
      doi: '',
      publishedAt: daysAgo(6, 10),
      authorId: admin.id,
      views: 890
    }
  ];

  // ---------- 社区 ----------
  const communities = [
    { id: N(), name: 'iGEM 竞赛组队', slug: 'igem', type: 'competition', description: '国际基因工程机器大赛：组队、建模、人类实践与 Wiki 全流程互助。', color: '#7c3aed', createdBy: synbioLi.id, createdAt: daysAgo(30) },
    { id: N(), name: '生物信息学交流', slug: 'bioinformatics', type: 'general', description: '生信流程搭建、代码调试、数据可视化与升学求职讨论。', color: '#2563eb', createdBy: bioWang.id, createdAt: daysAgo(28) },
    { id: N(), name: '科研组队广场', slug: 'recruitment', type: 'recruitment', description: '大创、挑战杯、国创与实验室进组：发布和寻找靠谱队友 / 成员。', color: '#ea580c', createdBy: admin.id, createdAt: daysAgo(25) },
    { id: N(), name: '神经科学前沿', slug: 'neuroscience', type: 'general', description: '从分子到环路，讨论神经科学最新进展与经典问题。', color: '#db2777', createdBy: labZhang.id, createdAt: daysAgo(20) },
    { id: N(), name: '合成生物学', slug: 'synbio', type: 'general', description: '基因线路设计、定向进化、代谢工程与生物制造。', color: '#0d9488', createdBy: synbioLi.id, createdAt: daysAgo(18) },
    { id: N(), name: '湿实验技术交流', slug: 'wetlab', type: 'general', description: 'WB、PCR、细胞培养、蛋白纯化……实验 troubleshooting 互助。', color: '#0f766e', createdBy: wetlabChen.id, createdAt: daysAgo(12) }
  ];
  const [igem, bioinfo, recruitSq, neuro, synbio, wetlab] = communities;

  // ---------- 帖子 ----------
  const posts = [
    {
      id: N(),
      communityId: igem.id,
      authorId: synbioLi.id,
      type: 'recruit_teammate',
      title: '【iGEM 2026 战队招新】实验组 / 建模组 / 人类实践组全面招募',
      content:
        '大家好！我们是一支长三角高校联队，2026 赛季主题方向为「工程益生菌的代谢调控与疾病干预」，已完成预注册，现面向全国高校招募队友：\n\n实验组（3 名）：熟悉分子克隆、微生物培养、荧光报告系统者优先；\n建模组（2 名）：掌握常微分方程建模或机器学习，熟练使用 MATLAB / Python；\n人类实践组（2 名）：擅长科普策划、访谈调研、平面或视频设计。\n\n队伍提供：往届金牌队员全程带队、完整的湿实验与干实验培训体系、赛季期间住宿与耗材支持。\n\n有意者请在评论区留言并附一段自我介绍，或加入本社区后私信联系。期待与你一起站上 2026 Jamboree 的舞台！',
      tags: ['iGEM', '组队', '合成生物学'],
      createdAt: daysAgo(0, 6)
    },
    {
      id: N(),
      communityId: igem.id,
      authorId: synbioLi.id,
      type: 'resource',
      title: 'iGEM Wiki 搭建经验分享：从零基础到 Best Wiki 提名',
      content:
        '去年我们队伍拿到了 Best Wiki 提名，分享一下踩过的坑，希望能帮到今年的新队伍：\n\n1. 尽早定版式：先确定配色、字体与页面骨架，内容后填，避免返工；\n2. 评委视角写作：每个页面先写「问题—设计—结果—反思」四段结构；\n3. 图优于表、表优于字：把所有湿实验数据做成可交互图表；\n4. 多浏览器测试：Jamboree 现场用的是组委会提供的电脑，兼容性要提前验证。\n\n需要模板的同学可以留言，我把仓库链接发出来。',
      tags: ['iGEM', 'Wiki', '经验分享'],
      createdAt: daysAgo(1, 10)
    },
    {
      id: N(),
      communityId: bioinfo.id,
      authorId: bioWang.id,
      type: 'discussion',
      title: '求助：单细胞测序数据的批次效应，大家一般怎么校正？',
      content:
        '最近在处理两批不同时间上机测序的 scRNA-seq 数据，Seurat 标准流程整合后，UMAP 上两批样本之间仍有明显分离。\n\n我尝试了 Harmony 和 scVI，结果差异比较大：Harmony 把批次抹得比较平，但丢失了一些细胞类型内部结构；scVI 保留得更好但下游差异分析不好衔接。\n\n想请教大家：1）什么情况下优先选哪种方法？2）如何评估是否「校正过度」？欢迎分享实战经验，谢谢！',
      tags: ['单细胞', '批次效应', 'Seurat'],
      createdAt: daysAgo(0, 8)
    },
    {
      id: N(),
      communityId: bioinfo.id,
      authorId: bioWang.id,
      type: 'recruit_teammate',
      title: '大创项目急招生信分析队友：肿瘤免疫微环境方向（R / Python 均可）',
      content:
        '坐标某 985 高校，大创国家级立项项目，方向是「基于公共数据集的肿瘤免疫微环境异质性分析」，目前已有一位实验方向同学和一位临床方向同学。\n\n现招 1-2 名生信队友：\n· 熟悉 R（Seurat / DESeq2）或 Python（scanpy）；\n· 每周能投入 6-8 小时，至少合作一个完整学期；\n· 目标产出：一篇共一 SCI 或挑战杯省奖。\n\n感兴趣的同学请留言或私信，附上你做过的小项目链接更好。',
      tags: ['大创', '组队', '肿瘤免疫'],
      createdAt: daysAgo(1, 15)
    },
    {
      id: N(),
      communityId: recruitSq.id,
      authorId: synbioLi.id,
      type: 'recruit_teammate',
      title: '挑战杯生命科学赛道组队：肿瘤类器官药敏平台，缺 1-2 名队友',
      content:
        '项目已进入中期：用患者来源肿瘤类器官（PDO）构建药敏检测平台，已有预实验数据，计划冲击 2026 挑战杯省赛。\n\n现有成员：类器官培养（湿实验）2 人、临床对接 1 人。\n\n急需：\n· 图像 / 数据分析 1 名：能用 ImageJ / Python 处理明场与荧光图像并做统计分析；\n· 文案与答辩 1 名：负责商业计划书与路演 PPT。\n\n合作形式：共同署名，按贡献排序。有意请在评论区介绍你的技能，我私信拉群。',
      tags: ['挑战杯', '类器官', '组队'],
      createdAt: daysAgo(0, 10)
    },
    {
      id: N(),
      communityId: recruitSq.id,
      authorId: labZhang.id,
      type: 'recruit_member',
      title: '本课题组招募科研助理 / 本科生进组：神经退行性疾病方向（长期有效）',
      content:
        '课题组位于华东某高校神经科学研究所，方向为帕金森病相关蛋白的相分离与线粒体质量控制机制，经费充足，近三年发表多篇中科院一区论文。\n\n现招募：\n· 科研助理（本科及以上，有生化 / 细胞实验经验者优先，待遇面议）；\n· 本科生进组（大二及以上，保证每周 2-3 个半天，支持大创立项与毕业论文）。\n\n欢迎对神经科学感兴趣、有长期科研意愿的同学留言或私信咨询。',
      tags: ['科研助理', '神经科学', '进组'],
      createdAt: daysAgo(2, 9)
    },
    {
      id: N(),
      communityId: recruitSq.id,
      authorId: wetlabChen.id,
      type: 'recruit_member',
      title: '暑期科研训练营开放申请：结构生物学方向，含住宿补贴与导师指导',
      content:
        '某国家重点实验室暑期训练营（7 月初 - 8 月底，共 8 周）开放申请：\n\n· 方向：膜蛋白表达纯化 + 冷冻电镜结构解析；\n· 对象：生命科学 / 药学相关专业大二、大三本科生或研一学生；\n· 支持：免费住宿、每月生活补贴、全程一对一导师指导，优秀学员可获推荐信。\n\n名额 10 人，申请截止 5 月 20 日。感兴趣的同学请评论区留言，我把报名问卷私信给你。',
      tags: ['暑期科研', '结构生物学', '训练营'],
      createdAt: daysAgo(3, 10)
    },
    {
      id: N(),
      communityId: neuro.id,
      authorId: labZhang.id,
      type: 'discussion',
      title: '如何高效阅读神经科学顶刊文献？分享我的 5 步法',
      content:
        '在组会报告了两年文献，总结出一套自己的方法，分享给大家：\n\n1. 先读图不看字：把所有 figure 过一遍，用自己的话猜结论；\n2. 读摘要和最后一段，对照自己的猜测找差距；\n3. 精读 Results 中与图直接对应的段落；\n4. 把局限与「下一步」抄进自己的 idea 本；\n5. 一周后用自己的话复述一遍，讲不出的部分回头补。\n\n大家有什么提升文献阅读效率的独门技巧？欢迎交流。',
      tags: ['文献阅读', '学习方法'],
      createdAt: daysAgo(4, 10)
    },
    {
      id: N(),
      communityId: synbio.id,
      authorId: synbioLi.id,
      type: 'recruit_teammate',
      title: 'iDEC 2026 队伍招募：体内定向进化方向，欢迎生信与实验同学',
      content:
        'iDEC（国际定向进化大赛）2026 赛季组队中，主题是「噬菌体辅助连续进化优化 PET 降解酶」。\n\n现招募：\n· 实验组 2 名：噬菌体 / 大肠杆菌操作经验；\n· 生信组 1 名：酶结构建模、突变谱分析（会用 Rosetta / AlphaFold 加分）；\n· 设计组 1 名：Wiki 与海报设计。\n\n我们是第二年参赛，去年拿到了 Best Innovation 提名。有意请留言简介，欢迎跨校组队！',
      tags: ['iDEC', '定向进化', '组队'],
      createdAt: daysAgo(2, 14)
    },
    {
      id: N(),
      communityId: wetlab.id,
      authorId: wetlabChen.id,
      type: 'discussion',
      title: 'Western Blot 背景特别高，换了封闭液还是不行，求优化建议',
      content:
        '最近 WB 背景黑得离谱，已经试过 5% 脱脂奶粉封闭 1 h、TBST 洗 3 次 × 10 min，二抗也换了两个批号，背景依然很高。\n\n样本是 HEK293T 全细胞裂解液，一抗是某品牌兔抗（1:1000，4°C 过夜），ECL 曝光 30 s 全膜都是黑的。\n\n目前怀疑：1）一抗本身特异性差；2）曝光时间过长；3）转膜后有残留。有没有遇到过类似情况的朋友，求支招！',
      tags: ['Western Blot', '实验技术'],
      createdAt: daysAgo(0, 18)
    }
  ];

  // ---------- 精选仓库（Skill & MCP） ----------
  const repoItems = [
    {
      id: N(), type: 'mcp', name: 'arXiv MCP Server', author: 'blazickjp', category: '文献检索',
      tags: ['arXiv', '预印本', '文献检索', 'MCP'], logo: '📡', color: '#b31b1b',
      summary: '让 AI 助手直接检索、阅读与分析 arXiv 预印本论文的 MCP 服务器。',
      description: 'arxiv-mcp-server 是社区最流行的学术 MCP 服务器之一，为 Claude、Cursor 等 AI 工具提供 arXiv 论文搜索与下载能力。支持按关键词、作者、时间范围检索，可获取论文元数据与摘要，适合快速追踪领域最新预印本。\n\n在生命科学研究中，它可以帮你每天自动检索「CRISPR」「单细胞测序」等关键词的新预印本，或对某个专题批量拉取摘要做综述初稿，大幅节省文献筛查时间。',
      highlights: ['按关键词 / 作者 / 分类检索 arXiv 论文', '获取标题、摘要、作者与 arXiv ID', '支持下载论文 PDF', '配合定时任务实现「每日新预印本速递」'],
      install: 'uvx arxiv-mcp-server',
      usage: '{\n  "mcpServers": {\n    "arxiv": {\n      "command": "uvx",\n      "args": ["arxiv-mcp-server"]\n    }\n  }\n}',
      homepage: 'https://pypi.org/project/arxiv-mcp-server/',
      downloadUrl: 'https://github.com/blazickjp/arxiv-mcp-server',
      stars: 2300, downloadCount: 15200, views: 0,
      createdAt: daysAgo(12), authorId: editor.id
    },
    {
      id: N(), type: 'mcp', name: 'PubMed MCP（pubmedmcp）', author: 'grll', category: '文献检索',
      tags: ['PubMed', '生物医学', 'MeSH', 'MCP'], logo: '🩺', color: '#1d4ed8',
      summary: '连接 PubMed 数据库，AI 可实时检索生物医学文献、获取摘要与全文链接。',
      description: 'pubmedmcp 将 NCBI PubMed 的 E-utilities 接口封装为 MCP 工具，支持 MeSH 主题词检索、日期过滤与结果排序，返回结构化元数据。对生命科学研究者来说，这是文献调研最常用的入口之一。\n\n结合大模型，你可以用自然语言提问（如「近五年关于肿瘤微环境的综述有哪些？」），由工具翻译成精准的 PubMed 检索式并返回结果，让文献调研从「翻网页」变成「对话」。',
      highlights: ['E-utilities 官方接口封装', '支持 MeSH 主题词与高级检索式', '返回摘要、期刊、DOI 等元数据', '可组合检索历史做系统性综述筛选'],
      install: 'uvx pubmedmcp',
      usage: '{\n  "mcpServers": {\n    "pubmed": {\n      "command": "uvx",\n      "args": ["pubmedmcp"]\n    }\n  }\n}',
      homepage: 'https://pypi.org/project/pubmedmcp/',
      downloadUrl: 'https://github.com/grll/pubmedmcp',
      stars: 860, downloadCount: 9400, views: 0,
      createdAt: daysAgo(11), authorId: editor.id
    },
    {
      id: N(), type: 'mcp', name: 'Academic MCP', author: 'veale', category: '文献检索',
      tags: ['Zotero', 'Semantic Scholar', 'OpenAlex', 'MCP'], logo: '🎓', color: '#7c3aed',
      summary: '一个服务器同时打通 Zotero 文献库、Semantic Scholar 与 OpenAlex 三大文献源。',
      description: 'academic-mcp 将三大开放文献源统一为同一套工具接口：可以搜索 Semantic Scholar 与 OpenAlex 的论文数据库，也可以直接检索你自己的 Zotero 文献库，适合「外部检索 + 内部管理」一体化的研究流。\n\n安装一个服务器即可让 AI 助手在你的参考文献体系内工作：查新文献、查已有条目、按项目筛选引用，省去多服务器配置的麻烦。',
      highlights: ['Zotero 本地文献库检索', 'Semantic Scholar 语义搜索', 'OpenAlex 全量学术图谱', '统一接口，配置简单'],
      install: 'git clone https://github.com/veale/academic-mcp\ncd academic-mcp\n# 按 README 配置 API Key 后启动',
      usage: '在 AI 助手中提问：「在我的 Zotero 文献库中找出 2023 年后关于类器官的文章，并按被引数排序。」',
      homepage: '',
      downloadUrl: 'https://github.com/veale/academic-mcp',
      stars: 420, downloadCount: 3100, views: 0,
      createdAt: daysAgo(10), authorId: editor.id
    },
    {
      id: N(), type: 'mcp', name: 'MCP Research（Zotero 接口）', author: 'francojc', category: '文献管理',
      tags: ['Zotero', '参考文献', '论文写作', 'MCP'], logo: '📚', color: '#0f766e',
      summary: '专门对接 Zotero 的 MCP 服务器，让 AI 直接管理你的参考文献库。',
      description: 'mcp-research 聚焦 Zotero 本地文献库，提供书目检索、条目读取与管理能力。对论文写作场景尤其友好：可以让 AI 助手按项目查找引用、生成参考文献列表、核对元数据。\n\n配合 Zotero 的 Better BibTeX 插件与 Word / LibreOffice 集成，可以实现「AI 查找文献 → 自动插入引用 → 一键生成参考文献」的写作流。',
      highlights: ['连接本地 Zotero 库', '按集合 / 标签检索条目', '辅助引用与参考文献生成', '支持书目格式元数据核对'],
      install: 'git clone https://github.com/francojc/mcp-research\ncd mcp-research\n# 按 README 配置 Zotero 本地 API 后启动',
      usage: '让 AI 助手：「列出我「论文写作」集合中的所有条目，生成 APA 格式参考文献。」',
      homepage: '',
      downloadUrl: 'https://github.com/francojc/mcp-research',
      stars: 310, downloadCount: 2600, views: 0,
      createdAt: daysAgo(9), authorId: editor.id
    },
    {
      id: N(), type: 'mcp', name: 'Filesystem MCP Server（官方）', author: 'modelcontextprotocol', category: '通用效率',
      tags: ['官方', '文件管理', '自动化', 'MCP'], logo: '🗂️', color: '#0f8a5f',
      summary: '官方文件系统服务器，让 AI 在指定目录内安全读写科研数据与文档。',
      description: 'Filesystem MCP 是 Model Context Protocol 官方参考实现之一，为 AI 助手提供受限目录内的文件读写、目录遍历与搜索能力，是本地科研数据工作流的基础组件。\n\n配合 Claude Code 等客户端，你可以让 AI 批量整理测序数据目录、统一命名实验记录、汇总多个 Excel 结果表，所有操作被限制在你指定的目录内，安全可控。',
      highlights: ['官方实现，稳定可靠', '目录级访问控制', '文件读写 / 搜索 / 元数据', '可与任意 MCP 客户端组合'],
      install: 'npx -y @modelcontextprotocol/server-filesystem /Users/you/ResearchData',
      usage: '在 Claude Code 中：「读取 data/ 目录下所有 CSV 文件，汇总各样本的统计指标并生成 markdown 表格。」',
      homepage: 'https://modelcontextprotocol.io',
      downloadUrl: 'https://github.com/modelcontextprotocol/servers',
      stars: 42000, downloadCount: 89000, views: 0,
      createdAt: daysAgo(8), authorId: editor.id
    },
    {
      id: N(), type: 'mcp', name: 'Firecrawl MCP', author: 'firecrawl', category: '数据采集',
      tags: ['网页抓取', '数据采集', '爬虫', 'MCP'], logo: '🕷️', color: '#ea580c',
      summary: '把任意网页变成干净的 Markdown / 结构化数据，供 AI 分析。',
      description: 'Firecrawl 官方 MCP 服务器提供网页抓取、爬取与内容提取能力，能把期刊页面、机构官网、会议日程等网页转换为干净的 Markdown 或结构化 JSON。\n\n做系统综述或信息汇总时，可以让 AI 批量抓取指定页面并抽取关键信息（如会议截稿日期、试剂价格、设备参数），免去手动复制粘贴。',
      highlights: ['网页转 Markdown / 结构化 JSON', '批量爬取站点', '自动处理渲染与反爬', '官方维护，含云服务 API'],
      install: 'npx -y firecrawl-mcp',
      usage: '{\n  "mcpServers": {\n    "firecrawl": {\n      "command": "npx",\n      "args": ["-y", "firecrawl-mcp"]\n    }\n  }\n}',
      homepage: 'https://firecrawl.dev',
      downloadUrl: 'https://github.com/firecrawl/firecrawl-mcp-server',
      stars: 1900, downloadCount: 12000, views: 0,
      createdAt: daysAgo(7), authorId: editor.id
    },
    {
      id: N(), type: 'mcp', name: 'MCP Omnisearch', author: 'spences10', category: '文献检索',
      tags: ['搜索引擎', '情报收集', 'GitHub', 'MCP'], logo: '🔎', color: '#2563eb',
      summary: '一个 MCP 统一接入 Tavily、Brave、Kagi、Exa 等多家搜索引擎与内容提取服务。',
      description: 'mcp-omnisearch 把多个搜索引擎（Tavily / Brave / Kagi / Exa）与内容提取服务（Firecrawl / Tavily / Kagi）聚合为单一接口，并内置 GitHub 搜索。\n\n对科研情报收集很有用：一个服务器即可对比多个搜索引擎的结果、抓取关键页面内容，还能直接搜索 GitHub 上的开源工具与数据集。',
      highlights: ['聚合多家搜索引擎', '内容提取一体化', '内置 GitHub 搜索', '单接口多服务，切换方便'],
      install: 'npx -y mcp-omnisearch',
      usage: '在 AI 助手中：「分别用 Tavily 和 Exa 搜索 organoid drug screening 2025，对比两家的前 5 条结果。」',
      homepage: '',
      downloadUrl: 'https://github.com/spences10/mcp-omnisearch',
      stars: 640, downloadCount: 5300, views: 0,
      createdAt: daysAgo(6), authorId: editor.id
    },
    {
      id: N(), type: 'skill', name: 'Anthropic 官方 Agent Skills', author: 'anthropics', category: '论文写作',
      tags: ['Agent Skills', '文档处理', '论文写作', '官方'], logo: '🧩', color: '#d97706',
      summary: 'Anthropic 官方开源的 Agent Skills 仓库：让 AI 真正会用 Word、PPT、Excel 与 PDF。',
      description: 'Skills 是 Anthropic 提出的「技能」机制：把操作知识（怎么用 docx、怎么排版 pptx）以文件夹的形式教给智能体。官方仓库提供 docx / pptx / xlsx / pdf 四个文档技能，附带丰富示例与评估脚本。\n\n对科研写作尤其实用：让 AI 直接生成符合期刊模板的 Word 手稿、制作组会汇报 PPT、把实验数据整理进 Excel 表格，而不是只输出「可以粘贴的文本」。',
      highlights: ['官方实现，持续更新', 'docx / pptx / xlsx / pdf 四大文档技能', '附带技能开发模板（skill-creator）', '可用于 Claude Code / Claude 应用'],
      install: 'git clone https://github.com/anthropics/skills',
      usage: '把 skills/docx 放入 ~/.claude/skills/ 后，对 Claude Code 说：「按 Cell 期刊投稿格式，把这篇初稿整理成 Word 文档。」',
      homepage: 'https://github.com/anthropics/skills',
      downloadUrl: 'https://github.com/anthropics/skills',
      stars: 18000, downloadCount: 64000, views: 0,
      createdAt: daysAgo(5), authorId: admin.id
    },
    {
      id: N(), type: 'skill', name: 'Superpowers', author: 'obra', category: '通用效率',
      tags: ['Claude Code', '写作', '头脑风暴', 'Skill'], logo: '🦸', color: '#7c3aed',
      summary: '社区最受欢迎的 Claude Code 技能集：头脑风暴、系统化写作、调试与规划工作流。',
      description: 'Superpowers 是 Jesse Vincent 开发的高口碑技能集，通过插件市场一键安装，为 Claude Code 增加 brainstorming、writing、test-driven debugging、planning 等系统性工作流技能。\n\n它的方法论（如先探索后执行的写作循环、结构化头脑风暴）对科研场景同样有效：从开题 brainstorm、基金本子写作到代码调试都能用上。',
      highlights: ['插件市场一键安装', '头脑风暴与系统化写作技能', 'TDD 调试与规划工作流', '活跃维护，社区反馈好'],
      install: '/plugin marketplace add obra/superpowers-marketplace\n/plugin install superpowers@superpowers-marketplace',
      usage: '在 Claude Code 中调用 brainstorming 技能：「帮我 brainstorm 一个关于相分离的基金项目选题，目标青年基金。」',
      homepage: '',
      downloadUrl: 'https://github.com/obra/superpowers',
      stars: 16000, downloadCount: 48000, views: 0,
      createdAt: daysAgo(4), authorId: editor.id
    },
    {
      id: N(), type: 'skill', name: 'Awesome Claude Code', author: 'hesreallyhim', category: '合集导航',
      tags: ['合集', '导航', 'Claude Code', 'Skill'], logo: '⭐', color: '#db2777',
      summary: '200+ 精选 Claude Code 技能、工作流与命令的导航仓库，找工具先来这里。',
      description: 'awesome-claude-code 是社区维护的精选清单，按分类整理了大量 Skills、Workflows、Commands、Hooks 与 MCP 集成，每项都有简介与链接。\n\n不知道有什么好用的科研技能？从这里按 Research / Writing / Data 分类浏览，是发现新工具的最高效入口，也可以参考它的分类体系搭建自己的工具箱。',
      highlights: ['200+ 精选条目', '按用途分类导航', '社区持续更新', '每个条目附简介与链接'],
      install: 'git clone https://github.com/hesreallyhim/awesome-claude-code',
      usage: '打开仓库首页，按 Research / Writing 分类浏览，挑 2-3 个技能试用一周。',
      homepage: '',
      downloadUrl: 'https://github.com/hesreallyhim/awesome-claude-code',
      stars: 24000, downloadCount: 21000, views: 0,
      createdAt: daysAgo(3), authorId: editor.id
    },
    {
      id: N(), type: 'skill', name: 'Claude Skills Curated', author: 'jackculpan', category: '合集导航',
      tags: ['合集', '精选', 'Skill', '入门'], logo: '🎯', color: '#0d9488',
      summary: '人工精选的 Claude Code 技能与插件集合，附安装说明与场景建议。',
      description: 'claude-skills-curated 是一份人工筛选的技能清单，去粗取精，每个技能都标注了适用场景与安装方式，避免在大而全的列表里大海捞针。\n\n适合刚接触 Agent Skills 的科研用户：按清单快速装齐「文献、写作、数据」三件套，再按需扩展。',
      highlights: ['人工筛选，质量优先', '附安装说明', '标注适用场景', '与 awesome 清单互补'],
      install: 'git clone https://github.com/jackculpan/claude-skills-curated',
      usage: '按 README 的推荐清单，先安装文档处理与网页搜索相关技能。',
      homepage: '',
      downloadUrl: 'https://github.com/jackculpan/claude-skills-curated',
      stars: 1100, downloadCount: 6900, views: 0,
      createdAt: daysAgo(2), authorId: editor.id
    },
    {
      id: N(), type: 'mcp', name: 'Awesome MCP Servers', author: 'jchris', category: '合集导航',
      tags: ['MCP', '合集', '导航', '生态'], logo: '🗺️', color: '#475569',
      summary: '按类别整理的 MCP 服务器大全：从官方实现到科研专用服务器一网打尽。',
      description: 'awesome-mcp-servers 是 MCP 生态最全的目录仓库之一，按功能分类收录数百个服务器，覆盖搜索、数据库、文件、浏览器自动化等领域。\n\n在科研场景中，可以按 Search & Research、Science、Notion 等分类找到适合的服务器，是搭建个人「学术 AI 助手」的最佳起点。',
      highlights: ['数百个服务器分类收录', '官方与社区实现齐全', '含科研 / 学术专用分类', '社区持续更新'],
      install: 'git clone https://github.com/jchris/awesome-mcp-servers',
      usage: '打开仓库，浏览 Search & Research 分类，挑一个配合你的文献工具链。',
      homepage: '',
      downloadUrl: 'https://github.com/jchris/awesome-mcp-servers',
      stars: 9000, downloadCount: 15000, views: 0,
      createdAt: daysAgo(1), authorId: editor.id
    }
  ];

  // ---------- 评论 ----------
  const comments = [
    { id: N(), targetType: 'post', targetId: posts[0].id, authorId: bioWang.id, parentId: null, content: '建模组还招人吗？我数学建模省一，Python 熟练，想了解一下训练节奏。', createdAt: daysAgo(0, 7, 30) },
    { id: N(), targetType: 'post', targetId: posts[0].id, authorId: synbioLi.id, parentId: null, content: '招的！建模组目前 1 人，欢迎加入社区后私信我，给你发训练计划。', createdAt: daysAgo(0, 8, 0) },
    { id: N(), targetType: 'post', targetId: posts[0].id, authorId: wetlabChen.id, parentId: null, content: '实验组需要湿实验经验到什么程度？会基本的分子克隆可以吗？', createdAt: daysAgo(0, 9, 0) },
    { id: N(), targetType: 'post', targetId: posts[2].id, authorId: admin.id, parentId: null, content: '推荐先看数据质量：如果两批测序深度差异大，先做 downsampling。scVI 的 latent 空间做下游差异分析有专门工具（scvi-tools），不用回 Seurat。', createdAt: daysAgo(0, 9, 30) },
    { id: N(), targetType: 'post', targetId: posts[2].id, authorId: bioWang.id, parentId: null, content: '我们组习惯 Harmony 快速过一遍看聚类，再用 scVI 做最终整合，两个结果互相印证会踏实很多。', createdAt: daysAgo(0, 10, 0) },
    { id: N(), targetType: 'post', targetId: posts[2].id, authorId: synbioLi.id, parentId: null, content: '补充一个判断标准：校正后同一细胞类型在批次间应充分混合，但不同类型不能黏在一起，可以用 kNN purity 量化。', createdAt: daysAgo(0, 11, 0) },
    { id: N(), targetType: 'post', targetId: posts[4].id, authorId: bioWang.id, parentId: null, content: '会用 ImageJ 写 macro，Python 图像处理也写过（opencv），坐标杭州，可以线下。', createdAt: daysAgo(0, 12, 0) },
    { id: N(), targetType: 'post', targetId: posts[4].id, authorId: labZhang.id, parentId: null, content: '文案我可以！做过两个省赛项目的路演 PPT，求拉。', createdAt: daysAgo(0, 13, 0) },
    { id: N(), targetType: 'post', targetId: posts[6].id, authorId: wetlabChen.id, parentId: null, content: '大三在读，上过结构生物学课，做过蛋白表达，想申请训练营，求问卷！', createdAt: daysAgo(3, 12, 0) },
    { id: N(), targetType: 'post', targetId: posts[6].id, authorId: admin.id, parentId: null, content: '补充信息：训练营结业会组织 mini 课题答辩，往届有 3 位学员留组读研。', createdAt: daysAgo(3, 15, 0) },
    { id: N(), targetType: 'post', targetId: posts[9].id, authorId: synbioLi.id, parentId: null, content: '试试把一抗浓度降到 1:2000、4°C 过夜改成室温 1h；另外确认转膜后先丽春红染色看转移效率，排除转移不均。', createdAt: daysAgo(0, 19, 0) },
    { id: N(), targetType: 'post', targetId: posts[9].id, authorId: wetlabChen.id, parentId: null, content: '感谢！丽春红染色全膜都有条带，应该不是转移问题，我降一下一抗浓度试试。', createdAt: daysAgo(0, 20, 0) },
    { id: N(), targetType: 'article', targetId: articles[0].id, authorId: bioWang.id, parentId: null, content: 'AlphaFold Server 已经用上了，普通笔记本浏览器就能跑，蛋白+小分子复合物预测对虚拟筛选帮助很大。', createdAt: daysAgo(0, 9, 0) },
    { id: N(), targetType: 'article', targetId: articles[0].id, authorId: labZhang.id, parentId: null, content: '好奇训练数据里小分子构象的偏差是怎么处理的，有相关的解读文章推荐吗？', createdAt: daysAgo(0, 10, 0) },
    { id: N(), targetType: 'article', targetId: articles[4].id, authorId: labZhang.id, parentId: null, content: '这个图谱对发育神经生物学的同学太有用了，空间定位数据已下载，感谢分享！', createdAt: daysAgo(2, 11, 0) },
    { id: N(), targetType: 'article', targetId: articles[5].id, authorId: wetlabChen.id, parentId: null, content: '我们平台刚上了新一代探测器，2 Å 以下真的越来越常见了，AI 颗粒挑选省了一半人工。', createdAt: daysAgo(2, 17, 0) },
    { id: N(), targetType: 'article', targetId: articles[1].id, authorId: synbioLi.id, parentId: null, content: '我们队去年就是看了这样的整理帖才顺利组队的，今年继续在社区里发招募，欢迎新同学！', createdAt: daysAgo(0, 8, 0) }
  ];

  // ---------- 点赞 ----------
  const likes = [
    { userId: bioWang.id, targetType: 'article', targetId: articles[0].id },
    { userId: labZhang.id, targetType: 'article', targetId: articles[0].id },
    { userId: admin.id, targetType: 'article', targetId: articles[2].id },
    { userId: synbioLi.id, targetType: 'article', targetId: articles[3].id },
    { userId: labZhang.id, targetType: 'article', targetId: articles[4].id },
    { userId: wetlabChen.id, targetType: 'article', targetId: articles[5].id },
    { userId: bioWang.id, targetType: 'post', targetId: posts[0].id },
    { userId: wetlabChen.id, targetType: 'post', targetId: posts[0].id },
    { userId: admin.id, targetType: 'post', targetId: posts[2].id },
    { userId: synbioLi.id, targetType: 'post', targetId: posts[2].id },
    { userId: labZhang.id, targetType: 'post', targetId: posts[4].id },
    { userId: synbioLi.id, targetType: 'post', targetId: posts[4].id },
    { userId: wetlabChen.id, targetType: 'post', targetId: posts[6].id },
    { userId: bioWang.id, targetType: 'post', targetId: posts[1].id },
    { userId: labZhang.id, targetType: 'post', targetId: posts[7].id },
    { userId: synbioLi.id, targetType: 'post', targetId: posts[9].id },
    { userId: bioWang.id, targetType: 'repo', targetId: repoItems[0].id },
    { userId: synbioLi.id, targetType: 'repo', targetId: repoItems[0].id },
    { userId: admin.id, targetType: 'repo', targetId: repoItems[7].id },
    { userId: labZhang.id, targetType: 'repo', targetId: repoItems[8].id },
    { userId: bioWang.id, targetType: 'repo', targetId: repoItems[10].id },
    { userId: wetlabChen.id, targetType: 'repo', targetId: repoItems[11].id }
  ];

  // ---------- 社区成员 ----------
  const memberships = [
    { communityId: igem.id, userId: synbioLi.id, role: 'owner', joinedAt: daysAgo(30) },
    { communityId: igem.id, userId: bioWang.id, role: 'member', joinedAt: daysAgo(22) },
    { communityId: igem.id, userId: labZhang.id, role: 'member', joinedAt: daysAgo(15) },
    { communityId: igem.id, userId: admin.id, role: 'member', joinedAt: daysAgo(10) },
    { communityId: bioinfo.id, userId: bioWang.id, role: 'owner', joinedAt: daysAgo(28) },
    { communityId: bioinfo.id, userId: synbioLi.id, role: 'member', joinedAt: daysAgo(20) },
    { communityId: bioinfo.id, userId: admin.id, role: 'member', joinedAt: daysAgo(12) },
    { communityId: recruitSq.id, userId: admin.id, role: 'owner', joinedAt: daysAgo(25) },
    { communityId: recruitSq.id, userId: synbioLi.id, role: 'member', joinedAt: daysAgo(18) },
    { communityId: recruitSq.id, userId: bioWang.id, role: 'member', joinedAt: daysAgo(15) },
    { communityId: recruitSq.id, userId: labZhang.id, role: 'member', joinedAt: daysAgo(10) },
    { communityId: recruitSq.id, userId: wetlabChen.id, role: 'member', joinedAt: daysAgo(8) },
    { communityId: neuro.id, userId: labZhang.id, role: 'owner', joinedAt: daysAgo(20) },
    { communityId: neuro.id, userId: admin.id, role: 'member', joinedAt: daysAgo(14) },
    { communityId: neuro.id, userId: bioWang.id, role: 'member', joinedAt: daysAgo(9) },
    { communityId: synbio.id, userId: synbioLi.id, role: 'owner', joinedAt: daysAgo(18) },
    { communityId: synbio.id, userId: wetlabChen.id, role: 'member', joinedAt: daysAgo(11) },
    { communityId: wetlab.id, userId: wetlabChen.id, role: 'owner', joinedAt: daysAgo(12) },
    { communityId: wetlab.id, userId: bioWang.id, role: 'member', joinedAt: daysAgo(6) }
  ];

  // ---------- 学科竞赛交流社区 + 比赛动态 ----------
  const compHub = {
    id: N(),
    ...COMPETITION_HUB,
    createdBy: admin.id,
    createdAt: daysAgo(20)
  };
  communities.push(compHub);

  const slugIds = {
    'competition-hub': compHub.id,
    igem: igem.id,
    recruitment: recruitSq.id
  };
  const competitions = competitionEntries(slugIds, admin.id).map((c) => ({ id: N(), ...c }));
  memberships.push({ communityId: compHub.id, userId: admin.id, role: 'owner', joinedAt: daysAgo(20) });
  memberships.push({ communityId: compHub.id, userId: synbioLi.id, role: 'member', joinedAt: daysAgo(12) });
  memberships.push({ communityId: compHub.id, userId: bioWang.id, role: 'member', joinedAt: daysAgo(10) });

  // ---------- OpenMedAI 协作模块 ----------
  const om = omSeedData();
  const userMap = {
    admin: admin.id,
    editor: editor.id,
    synbio_li: synbioLi.id,
    bio_wang: bioWang.id,
    lab_zhang: labZhang.id,
    wetlab_chen: wetlabChen.id
  };
  const omTopics = om.topics.map((t) => ({
    id: N(),
    title: t.title,
    direction: t.direction,
    ownerId: userMap[t.owner] || 0,
    status: t.status,
    description: t.description,
    deliverables: t.deliverables,
    tags: t.tags,
    views: t.views,
    createdAt: t.createdAt
  }));
  const omRef = (i) => omTopics[i.topic].id;
  const participations = om.participations.map((p) => ({
    id: N(),
    topicId: omRef(p),
    userId: userMap[p.user] || 0,
    role: p.role,
    hoursPerWeek: p.hours,
    authorshipIntent: p.authorship,
    note: p.note,
    status: p.status,
    createdAt: '2026-08-28T08:00:00.000Z'
  }));
  const claims = om.claims.map((c) => ({
    id: N(),
    topicId: omRef(c),
    userId: userMap[c.user] || 0,
    claimType: c.claimType,
    note: c.note,
    status: c.status,
    createdAt: '2026-08-28T09:00:00.000Z'
  }));
  const sponsors = om.sponsors.map((s) => ({
    id: N(),
    topicId: omRef(s),
    userId: userMap[s.user] || 0,
    sponsorType: s.sponsorType,
    note: s.note,
    status: s.status,
    createdAt: '2026-08-28T10:00:00.000Z'
  }));
  const omScores = om.scores.map((s) => ({
    id: N(),
    topicId: omRef(s),
    userId: userMap[s.user] || 0,
    score: s.score,
    createdAt: '2026-08-29T08:00:00.000Z'
  }));
  const intents = om.follows.map((f) => ({
    id: N(),
    topicId: omRef(f),
    userId: userMap[f.user] || 0,
    type: 'follow',
    createdAt: '2026-08-27T08:00:00.000Z'
  }));

  // ---------- 公开模式：不生成任何演示账号与演示用户数据 ----------
  if (publicMode) {
    return {
      seq,
      users: [],
      sessions: [],
      articles: articles.map((a) => ({ ...a, authorId: 0 })),
      communities: communities.map((c) => ({ ...c, createdBy: 0 })),
      posts: [],
      repoItems: repoItems.map((r) => ({ ...r, authorId: 0 })),
      competitions: competitions.map((c) => ({ ...c, authorId: 0 })),
      omTopics: omTopics.map((t) => ({ ...t, ownerId: 0 })),
      intents: [],
      participations: [],
      claims: [],
      sponsors: [],
      omScores: [],
      meta: { publicMode: true },
      comments: [],
      likes: [],
      memberships: []
    };
  }

  return {
    seq,
    users,
    sessions: [],
    articles,
    communities,
    posts,
    repoItems,
    competitions,
    omTopics,
    intents,
    participations,
    claims,
    sponsors,
    omScores,
    meta: {},
    comments,
    likes,
    memberships
  };
}
