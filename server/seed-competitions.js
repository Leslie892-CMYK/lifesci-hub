// 比赛动态种子数据（含学校竞赛目录认定信息）
// 供 buildSeed 与存量数据库迁移共用；目录等级依据学校认定的学科竞赛目录标注，
// 具体以创新创业学院（cxcy.hmc.edu.cn）最新发布为准。

export const COMPETITION_HUB = {
  name: '学科竞赛交流',
  slug: 'competition-hub',
  type: 'competition',
  description: '挑战杯、互联网+、生命科学竞赛、数学建模……竞赛通知解读、备赛经验与组队交流。',
  color: '#b45309'
};

// slugIds: { 'competition-hub': id, igem: id, recruitment: id }
export function competitionEntries(slugIds, createdBy) {
  const hub = slugIds['competition-hub'];
  const igem = slugIds.igem;
  const entries = [
    {
      title: '中国国际大学生创新大赛（2026）—— 我校选拔赛',
      source: '编辑发布',
      sourceUrl: 'https://cxcy.hmc.edu.cn/sy/tzgg/202604/t20260402_7196503.shtml',
      organizer: '教育部等部委联合主办；校内选拔由创新创业学院组织',
      type: '创新创业',
      catalogLevel: 'A类',
      level: '国家级',
      star: 5,
      intro: '中国国际大学生创新大赛（原「互联网+」大学生创新创业大赛）是国内覆盖面最广、影响力最大的大学生双创赛事。学校将组织 2026 年杭州医学院大学生创新大赛暨国赛选拔赛，优秀项目将推荐参加省赛与全国总决赛。',
      timeline: [
        { label: '校赛报名截止', date: '2026-04-30' },
        { label: '校赛网评', date: '2026-05' },
        { label: '省级复赛', date: '2026-06 ~ 07' },
        { label: '全国总决赛', date: '2026-10' }
      ],
      submission: '项目商业计划书（PPT 版 + Word 版）、项目路演视频（约 1 分钟）。鼓励结合学校医学特色，围绕智慧医疗、健康管理、生物医药等方向选题。',
      deadline: '2026-09-15',
      status: '进行中',
      tags: ['互联网+', '创新创业', 'A类竞赛'],
      communityId: hub,
      content: '中国国际大学生创新大赛（原「互联网+」大学生创新创业大赛）是国内覆盖面最广、影响最大的大学生双创赛事。\n\n学校创新创业学院每年组织校内选拔赛，并为入选团队提供导师指导、项目打磨与路演培训。有意参赛的同学请关注创新创业学院官网通知，并到「学科竞赛交流」社区与同学们组队交流。',
      publishedAt: '2026-04-02T08:00:00.000Z',
      authorId: createdBy,
      views: 460
    },
    {
      title: '第十五届「挑战杯」中国大学生创业计划竞赛（2026）',
      source: '编辑发布',
      sourceUrl: 'https://cxcy.hmc.edu.cn/sy/tzgg/202606/t20260618_7500663.shtml',
      organizer: '共青团中央、中国科协、教育部等',
      type: '创新创业',
      catalogLevel: 'A类',
      level: '国家级',
      star: 5,
      intro: '「挑战杯」中国大学生创业计划竞赛是全国最具代表性的大学生创业赛事之一，聚焦创新、协调、绿色、开放、共享五大发展理念，设科技创新和未来产业、乡村振兴和农业农村现代化、社会治理和公共服务等赛道。',
      timeline: [
        { label: '校级推荐', date: '2026-06' },
        { label: '省级复赛', date: '2026-07' },
        { label: '全国决赛', date: '2026-10 ~ 11' }
      ],
      submission: '创业计划书、项目展示 PPT，省级及以上阶段需现场路演答辩。',
      deadline: '2026-09-30',
      status: '进行中',
      tags: ['挑战杯', '创业计划', 'A类竞赛'],
      communityId: hub,
      content: '第十五届「挑战杯」中国大学生创业计划竞赛已全面启动。学校将根据省赛安排组织校内选拔与推荐，请各团队及时关注创新创业学院通知公告。\n\n备赛建议：尽早确定赛道与选题、打磨商业计划书逻辑闭环、准备路演 PPT 与答辩问题库。可在「学科竞赛交流」社区寻找队友与往届获奖经验分享。',
      publishedAt: '2026-06-18T09:00:00.000Z',
      authorId: createdBy,
      views: 380
    },
    {
      title: '第十一届全国大学生生命科学竞赛（创新创业类）',
      source: '编辑发布',
      sourceUrl: 'https://cxcy.hmc.edu.cn/sy/tzgg/202604/t20260402_7196494.shtml',
      organizer: '全国大学生生命科学竞赛委员会',
      type: '学科竞赛',
      catalogLevel: 'A类',
      level: '国家级',
      star: 5,
      intro: '全国大学生生命科学竞赛（创新创业类）是生命科学领域影响力最大的全国性赛事之一，分创新组（科研成果）与创业组（商业计划）两类，学校每年统一组织参赛并给予申报指导。',
      timeline: [
        { label: '网上申报', date: '即日起 ~ 2026-04-20' },
        { label: '资格审查', date: '2026-04-21 ~ 05-06' },
        { label: '网评', date: '2026-05' },
        { label: '省赛', date: '2026-06' },
        { label: '全国决赛（暂定）', date: '2026-07 下旬' }
      ],
      submission: '创新组：不超过 3 项成果（论文 / 专利 / 获奖等）+ 申报材料；创业组：商业计划书与团队信息。参赛队伍由 1-2 名指导老师与不超过 6 名学生组成，通过竞赛网络平台申报。',
      deadline: '2026-07-30',
      status: '已结束',
      tags: ['生命科学', '学科竞赛', 'A类竞赛'],
      communityId: hub,
      content: '依据《全国大学生生命科学竞赛章程》，2026 年举办第十一届全国大学生生命科学竞赛（创新创业类）。\n\n参赛条件：我校在校本、专科生均可组队报名，可跨学院组队，团队信息以项目负责人所在学校为第一单位。创新组作品重点关注科学性与创新性、规范性及申请学生的贡献度；创业组需完成商业计划书并通过网络平台提交。\n\n本届网上申报已于 2026 年 4 月 20 日截止，全国决赛于 7 月下旬举行。备赛下一届的同学可到社区查看经验帖。',
      publishedAt: '2026-04-02T08:00:00.000Z',
      authorId: createdBy,
      views: 520
    },
    {
      title: '2026 iGEM 国际遗传工程机器大赛',
      source: '编辑发布',
      sourceUrl: 'https://competition.igem.org/',
      organizer: 'iGEM Foundation',
      type: '学科竞赛',
      catalogLevel: 'B类',
      level: '国际级',
      star: 5,
      intro: 'iGEM 是合成生物学领域规模最大的国际大学生学术竞赛，以队伍为单位完成一个合成生物学项目，覆盖实验、建模、人类实践与 Wiki 展示全流程，是培养综合科研能力的顶级舞台。',
      timeline: [
        { label: '常规注册截止', date: '2026-03-31' },
        { label: '项目 Freeze', date: '2026-06' },
        { label: 'Wiki Freeze', date: '2026-09-15' },
        { label: 'Grand Jamboree', date: '2026-10' }
      ],
      submission: 'Wiki 项目网站、评审表格（Judging Form）、安全表格（Safety Form）与项目展示视频；现场需 Poster 展示与答辩。',
      deadline: '2026-09-15',
      status: '进行中',
      tags: ['iGEM', '合成生物学', '国际竞赛'],
      communityId: igem,
      content: 'iGEM 2026 赛季已进入备赛关键期。参赛队伍需在 Wiki Freeze 前完成项目网站的全部内容，并提交评审材料。\n\n本站「iGEM 竞赛组队」社区提供组队招募、建模与 Wiki 经验分享，欢迎备赛同学加入交流。',
      publishedAt: '2026-03-10T08:00:00.000Z',
      authorId: createdBy,
      views: 610
    },
    {
      title: '全国大学生数学建模竞赛（2026）—— 校内选拔赛',
      source: '编辑发布',
      sourceUrl: 'https://cxcy.hmc.edu.cn/sy/tzgg/202604/t20260402_7196492.shtml',
      organizer: '中国工业与应用数学学会',
      type: '学科竞赛',
      catalogLevel: 'A类',
      level: '国家级',
      star: 4,
      intro: '全国大学生数学建模竞赛创办于 1992 年，是规模最大的基础性学科竞赛之一。学校每年举办校内选拔赛，选拔优秀队伍参加浙江赛区竞赛，并组织赛前培训。',
      timeline: [
        { label: '校内选拔报名', date: '2026-05 前' },
        { label: '暑期集训', date: '2026-07 ~ 08' },
        { label: '全国竞赛', date: '2026-09' }
      ],
      submission: '建模论文（含问题分析、模型建立与求解、结果分析与代码附录），全国赛为 3 天封闭式团队赛。',
      deadline: '2026-09-01',
      status: '报名中',
      tags: ['数学建模', '学科竞赛', 'A类竞赛'],
      communityId: hub,
      content: '全国大学生数学建模竞赛浙江赛区竞赛即将启动，学校将组织校内选拔赛与暑期集训。\n\n对数学、统计与编程感兴趣的同学可组队报名（每队 3 人），医学背景的选题（如医学数据分析、流行病建模）也是历年获奖热门方向。欢迎到「学科竞赛交流」社区组队。',
      publishedAt: '2026-04-02T08:00:00.000Z',
      authorId: createdBy,
      views: 290
    },
    {
      title: '全国大学生物理实验竞赛（创新）暨浙江省选拔赛（2026）',
      source: '编辑发布',
      sourceUrl: 'https://cxcy.hmc.edu.cn/sy/tzgg/202604/t20260402_7196496.shtml',
      organizer: '教育部高等学校大学物理课程教学指导委员会等',
      type: '学科竞赛',
      catalogLevel: 'A类',
      level: '国家级',
      star: 4,
      intro: '全国大学生物理实验竞赛（创新）设命题类创新作品、自选课题类创新作品与大学生物理实验讲课比赛三个赛道，学校将举行校内选拔赛并推荐优秀作品参加浙江省选拔赛。',
      timeline: [
        { label: '校内选拔赛', date: '2026-04 ~ 05' },
        { label: '省级选拔赛', date: '2026-06' },
        { label: '全国总决赛', date: '2026-07 ~ 08' }
      ],
      submission: '命题类/自选课题类需提交实验作品、研究报告与展示视频；讲课比赛需提交讲课视频（15 分钟）与教学设计。',
      deadline: '2026-08-31',
      status: '报名中',
      tags: ['物理实验', '学科竞赛', 'A类竞赛'],
      communityId: hub,
      content: '2026 年全国大学生物理实验竞赛（创新）暨浙江省大学生物理实验与科技创新竞赛校内选拔赛已启动报名。\n\n有意参赛的同学请按通知要求准备作品，医工结合类实验课题（如医学物理、生物医学工程测量）是很有竞争力的选题方向。',
      publishedAt: '2026-03-27T08:00:00.000Z',
      authorId: createdBy,
      views: 240
    },
    {
      title: '第九届浙江省大学生乡村振兴创意大赛（2026）',
      source: '编辑发布',
      sourceUrl: 'https://cxcy.hmc.edu.cn/sy/tzgg/202604/t20260402_7195810.shtml',
      organizer: '浙江省教育厅等',
      type: '创新创业',
      catalogLevel: 'B类',
      level: '省级',
      star: 3,
      intro: '浙江省大学生乡村振兴创意大赛以服务乡村振兴战略为主题，设招标村赛题与自选村赛题，鼓励跨学科团队深入乡村开展创意设计、产业策划与社会调研。',
      timeline: [
        { label: '基地乡镇申报', date: '2026-04' },
        { label: '赛题征集与立项', date: '2026-05' },
        { label: '校赛评审', date: '2026-06 ~ 07' },
        { label: '省赛决赛', date: '2026-09 ~ 10' }
      ],
      submission: '招标村赛题需提交针对性策划方案；自选村赛题需提交项目策划书、调研报告与展示材料。',
      deadline: '2026-09-30',
      status: '进行中',
      tags: ['乡村振兴', '省级竞赛', 'B类竞赛'],
      communityId: hub,
      content: '第九届浙江省大学生乡村振兴创意大赛已启动基地乡镇申报及招标村赛题征集工作。\n\n医学类团队可围绕乡村健康服务、康养文旅、农产品深加工等方向选题，跨学院组队更占优势。',
      publishedAt: '2026-04-02T08:00:00.000Z',
      authorId: createdBy,
      views: 180
    }
  ];
  return entries;
}
