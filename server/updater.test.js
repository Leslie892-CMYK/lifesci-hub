import assert from 'node:assert/strict';
import test from 'node:test';
import { parseNoticeDetail, parseNoticeList } from './updater.js';

test('parseNoticeList reads the school competition listing format', () => {
  const html = `
    <a href="https://cxcy.hmc.edu.cn/sy/tzgg/202604/t20260402_7196494.shtml">
      <span class="day">04-02</span><span class="year">2026</span>
      <h4 class="title">关于组织参加全国大学生生命科学竞赛的通知</h4>
    </a>`;
  assert.deepEqual(parseNoticeList(html), [{
    href: 'https://cxcy.hmc.edu.cn/sy/tzgg/202604/t20260402_7196494.shtml',
    date: '2026-04-02',
    title: '关于组织参加全国大学生生命科学竞赛的通知'
  }]);
});

test('parseNoticeDetail extracts content fields without the website footer', () => {
  const html = `
    <div class="doc-title">全国大学生生命科学竞赛通知</div>
    <div>日期：<span>2026-04-02</span></div>
    <div class="doc-html">
      <p>各单位、部门：</p>
      <p>现将竞赛事项通知如下。</p>
      <p>一、参赛条件</p><p>在校生均可报名。</p>
      <p>二、网上提交材料要求</p>
      <p>创新组提交材料：报名表、作品申报书。</p>
      <p>三、竞赛时间安排</p>
      <p>网上申报：即日起-2026年9月20日</p>
      <script>document.write('附件');</script>
    </div>
    <div class="footer">联系我们 电话：123</div>`;
  const detail = parseNoticeDetail(html);
  assert.equal(detail.title, '全国大学生生命科学竞赛通知');
  assert.equal(detail.date, '2026-04-02T08:00:00.000Z');
  assert.match(detail.submission, /作品申报书/);
  assert.deepEqual(detail.timeline, [{ label: '网上申报', date: '即日起-2026年9月20日' }]);
  assert.equal(detail.deadline, '2026-09-20');
  assert.equal(detail.content.includes('联系我们'), false);
});
