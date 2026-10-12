// Markdown → Word(.docx) 转换器
// 用途：把交付文档等 Markdown 转成可打印/可发送的 Word 文档
// 用法：node server/md2docx.js <输入.md> <输出.docx>
// 支持：# ~ #### 标题、段落、表格、有序/无序列表、代码块、引用、分隔线、**加粗**、`行内代码`
import fs from 'node:fs';
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
  WidthType, AlignmentType, BorderStyle
} from 'docx';

const [input, output] = process.argv.slice(2);
if (!input || !output) {
  console.error('用法: node server/md2docx.js <输入.md> <输出.docx>');
  process.exit(1);
}

// 行内格式：**加粗** 与 `代码`
function runs(text, base = {}) {
  const out = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(new TextRun({ text: text.slice(last, m.index), ...base }));
    const token = m[0];
    if (token.startsWith('**')) {
      out.push(new TextRun({ text: token.slice(2, -2), bold: true, ...base }));
    } else {
      out.push(new TextRun({ text: token.slice(1, -1), font: 'Menlo', color: 'A31515', ...base }));
    }
    last = m.index + token.length;
  }
  if (last < text.length) out.push(new TextRun({ text: text.slice(last), ...base }));
  return out.length ? out : [new TextRun({ text: '', ...base })];
}

const HEADINGS = {
  1: HeadingLevel.HEADING_1,
  2: HeadingLevel.HEADING_2,
  3: HeadingLevel.HEADING_3,
  4: HeadingLevel.HEADING_4
};

const lines = fs.readFileSync(input, 'utf8').split(/\r?\n/);
const children = [];
let i = 0;
let inCode = false;
let codeBuf = [];

while (i < lines.length) {
  const line = lines[i];

  // 代码块
  if (line.trim().startsWith('```')) {
    if (!inCode) { inCode = true; codeBuf = []; }
    else {
      inCode = false;
      for (const cl of codeBuf) {
        children.push(new Paragraph({
          children: [new TextRun({ text: cl || ' ', font: 'Menlo', size: 18 })],
          shading: { fill: 'F5F5F5' },
          spacing: { after: 0 }
        }));
      }
      children.push(new Paragraph({ text: '', spacing: { after: 80 } }));
    }
    i++;
    continue;
  }
  if (inCode) { codeBuf.push(line); i++; continue; }

  // 表格
  if (line.trim().startsWith('|') && i + 1 < lines.length && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1])) {
    const rows = [];
    while (i < lines.length && lines[i].trim().startsWith('|')) {
      const cells = lines[i].trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      if (!/^[\s:|-]+$/.test(cells.join(''))) rows.push(cells);
      i++;
    }
    const head = rows[0] || [];
    const body = rows.slice(1);
    children.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          tableHeader: true,
          children: head.map((c) => new TableCell({
            shading: { fill: 'EEF3FA' },
            children: [new Paragraph({ children: runs(c, { bold: true, size: 18 }) })]
          }))
        }),
        ...body.map((r) => new TableRow({
          children: head.map((_, ci) => new TableCell({
            children: [new Paragraph({ children: runs(r[ci] ?? '', { size: 18 }) })]
          }))
        }))
      ]
    }));
    children.push(new Paragraph({ text: '', spacing: { after: 120 } }));
    continue;
  }

  const t = line.trim();

  // 分隔线
  if (/^-{3,}$/.test(t)) {
    children.push(new Paragraph({
      text: '',
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'BBBBBB' } },
      spacing: { after: 160 }
    }));
    i++;
    continue;
  }

  // 标题
  const h = t.match(/^(#{1,4})\s+(.*)$/);
  if (h) {
    const level = h[1].length;
    children.push(new Paragraph({
      heading: HEADINGS[level],
      children: runs(h[2], { bold: true, size: level === 1 ? 36 : level === 2 ? 28 : 24 }),
      spacing: { before: 240, after: 120 }
    }));
    i++;
    continue;
  }

  // 引用
  if (t.startsWith('>')) {
    children.push(new Paragraph({
      children: runs(t.replace(/^>\s?/, ''), { italics: true, color: '595959' }),
      indent: { left: 240 },
      spacing: { after: 100 }
    }));
    i++;
    continue;
  }

  // 列表
  const ul = t.match(/^[-*]\s+(.*)$/);
  if (ul) {
    children.push(new Paragraph({
      children: runs(ul[1]),
      bullet: { level: 0 },
      spacing: { after: 60 }
    }));
    i++;
    continue;
  }
  const ol = t.match(/^(\d+)[.、]\s+(.*)$/);
  if (ol) {
    children.push(new Paragraph({
      children: runs(`${ol[1]}. ${ol[2]}`),
      indent: { left: 240 },
      spacing: { after: 60 }
    }));
    i++;
    continue;
  }

  // 空行
  if (!t) { i++; continue; }

  // 普通段落
  children.push(new Paragraph({
    children: runs(t),
    spacing: { after: 120 },
    alignment: AlignmentType.LEFT
  }));
  i++;
}

const doc = new Document({
  styles: {
    default: {
      document: { run: { font: 'PingFang SC', size: 21 } }
    }
  },
  sections: [{ children }]
});

await Packer.toBuffer(doc).then((buf) => fs.writeFileSync(output, buf));
console.log(`✅ 已生成 Word 文档：${output}（${(fs.statSync(output).size / 1024).toFixed(0)} KB，${children.length} 个段落/表格）`);
