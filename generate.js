/**
 * generate.js — 一键生成博客文章 HTML
 *
 * 用法：
 *   node generate.js              # 扫描 blogs/ 下所有 .md 文件并生成对应 HTML
 *   node generate.js 文件名.md    # 只生成指定文件
 *
 * 文件命名规则：文件名以数字开头 + 连字符，例如 1-说明.md / 10-新文章.md。
 * 没有前缀数字的排在最后（sort: 999）。
 *
 * 首页列表由 <!-- ARTICLES:START --> / <!-- ARTICLES:END --> 标记定位。
 * 样式与交互分别在 assets/site.css、assets/site.js，改 UI 请改那两个文件。
 */

const fs = require('fs');
const path = require('path');

const BLOGS_DIR = path.join(__dirname, 'blogs');
const TEMPLATE = path.join(__dirname, 'blog-template.html');
const INDEX_HTML = path.join(__dirname, 'index.html');

// ── 工具 ────────────────────────────────────────────────────
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

// 资源路径：编码空格与括号，兼容 「exported_image (2).svg」 这类导出文件名
function encodeAssetPath(s) {
  return encodeURI(String(s).trim()).replace(/\(/g, '%28').replace(/\)/g, '%29');
}

// GFM 表格：此时公式已是占位符，单元格里的公式不会被 | 拆开
function renderTable(block) {
  const lines = block.trim().split('\n').map(l => l.trim()).filter(Boolean);
  const isSep = lines.length > 1 && /^[\s|:-]+$/.test(lines[1]) && lines[1].includes('-');
  if (!isSep) return block;
  const cells = line => line.replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
  const align = cells(lines[1]).map(s => {
    const t = s.replace(/\s/g, '');
    if (t.startsWith(':') && t.endsWith(':')) return 'center';
    if (t.endsWith(':')) return 'right';
    if (t.startsWith(':')) return 'left';
    return '';
  });
  const style = i => align[i] ? ` style="text-align:${align[i]}"` : '';
  const head = cells(lines[0]).map((c, i) => `<th${style(i)}>${c}</th>`).join('');
  const body = lines.slice(2).map(row =>
    `<tr>${cells(row).map((c, i) => `<td${style(i)}>${c}</td>`).join('')}</tr>`).join('');
  return `<div class="table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

// ── Markdown → HTML（占位符保护，保持数学公式原样） ───────────
function mdToHtml(md) {
  const store = [];
  // block=true 的保护项是块级元素，不能被 <p> 包裹；行内公式/代码则可以
  const protect = (frag, block) => (store.push(frag), `\x00${block ? 'B' : ''}${store.length - 1}\x00`);

  let html = md.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) =>
    protect(`<pre><code class="language-${lang}">${escapeHtml(code.trim())}</code></pre>`, true));
  html = html.replace(/`([^`\n]+)`/g, (_, code) => protect(`<code>${escapeHtml(code)}</code>`));
  html = html.replace(/\$\$([\s\S]+?)\$\$/g, (_, tex) =>
    protect(`<div class="math-display"><span class="math" data-tex="${encodeURIComponent(tex.trim())}"></span></div>`, true));
  html = html.replace(/\$([^$\n]+?)\$/g, (_, tex) =>
    protect(`<span class="math" data-tex="${encodeURIComponent(tex.trim())}"></span>`));

  // 尖括号形式的链接目标（路径含空格/括号）先保护，避免 <> 被下面的 HTML 转义吃掉
  html = html.replace(/!\[([^\]]*)\]\(<([^>]+)>\)/g, (_, alt, src) =>
    protect(`<img src="${escapeHtml(encodeAssetPath(src))}" alt="${escapeHtml(alt)}">`, true));
  html = html.replace(/\[([^\]]+)\]\(<([^>]+)>\)/g, (_, text, href) =>
    protect(`<a href="${escapeHtml(encodeAssetPath(href))}">${escapeHtml(text)}</a>`));

  html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/___(.+?)___/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');
  html = html.replace(/^---$/gm, '<hr>');
  // 普通形式（尖括号形式已在转义前保护）
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, src) =>
    `<img src="${escapeHtml(encodeAssetPath(src))}" alt="${escapeHtml(alt)}">`);
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, href) =>
    `<a href="${escapeHtml(encodeAssetPath(href))}">${text}</a>`);

  // 连续表格行合并渲染（逐行扫描比跨行正则可靠）
  {
    const lines = html.split('\n');
    const out = [];
    let i = 0;
    while (i < lines.length) {
      const isTableStart = /^\s*\|/.test(lines[i]) && i + 1 < lines.length &&
        /^[\s|:-]+$/.test(lines[i + 1]) && lines[i + 1].includes('-');
      if (isTableStart) {
        const block = [];
        while (i < lines.length && /^\s*\|/.test(lines[i])) { block.push(lines[i]); i++; }
        out.push(renderTable(block.join('\n')));
      } else {
        out.push(lines[i]); i++;
      }
    }
    html = out.join('\n');
  }

  html = html.replace(/^[\-\*] (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

  html = html.replace(/^(?!<[huplbod]|<\/|<pre|<code|<img|<hr|<blockquote|\x00B)(.+)$/gm, '<p>$1</p>');
  html = html.replace(/<p>\s*<\/p>/g, '');

  html = html.replace(/\x00B?(\d+)\x00/g, (_, i) => store[+i]);
  return html;
}

// ── 从正文首段提取摘要（不造内容） ────────────────────────────
function extractSummary(md) {
  // 公式转成可读纯文本，而不是删掉——否则会留下「举个例子： 表示了 和 之间」这种断句
  const plainTex = tex => tex
    .replace(/\\[a-zA-Z]+/g, ' ')
    .replace(/[{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const text = md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/^#{1,6}\s+.*$/gm, ' ')
    .replace(/^\|.*$/gm, ' ')
    .replace(/\$\$([\s\S]*?)\$\$/g, (_, tex) => ' ' + plainTex(tex) + ' ')
    .replace(/\$([^$\n]+?)\$/g, (_, tex) => plainTex(tex))
    .replace(/^>\s?/gm, '')
    .replace(/^[-*]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/!\[([^\]]*)\]\(<([^>]+)>\)/g, '$1')
    .replace(/\[([^\]]+)\]\(<([^>]+)>\)/g, '$1')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '$1')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
    .replace(/\*\*\*|___|\*\*|__|\*|`/g, '')
    .replace(/---+/g, ' ')
    .replace(/[ \t]*\n[ \t]*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // 取开头若干个完整句子，避免把公式密集的中间段落截成半句
  const picked = [];
  let length = 0;
  for (const sentence of (text.match(/[^。！？]+[。！？]?/g) || [])) {
    const part = sentence.trim();
    if (!part) continue;
    picked.push(part);
    length += part.length;
    if (length >= 40) break;
  }
  let out = picked.join(' ');
  return out.length > 68 ? out.slice(0, 68).trim() + '…' : out;
}

// ── frontmatter ─────────────────────────────────────────────
function parseFrontmatter(raw) {
  const fm = {};
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { meta: {}, content: raw };
  const body = match[2];
  match[1].split('\n').forEach(line => {
    const [k, ...vParts] = line.split(':');
    if (k && vParts.length) fm[k.trim()] = vParts.join(':').trim();
  });
  return { meta: fm, content: body };
}

function getSort(filename) {
  const m = filename.match(/^(\d+)/);
  return m ? parseInt(m[1], 10) : 999;
}

// 目录不再区分站务条目：严格按文件名前缀排序，全部连续编号

// ── 模板渲染：单次函数替换，避免 $ 与公式内容被误解释 ──────────
function renderTemplate(template, data) {
  return template.replace(/{{(\w+)}}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(data, key) ? data[key] : match);
}

// 按用户要求删去「← 上一篇」，只保留「下一篇 →」
function nextLink(article) {
  if (!article) return '';
  return `<a class="is-next" href="${escapeHtml(article.htmlFile)}">` +
    `<span class="nav-label">下一篇 →</span>` +
    `<span class="nav-title">${escapeHtml(article.title)}</span></a>`;
}

// ── 首页目录行 ──────────────────────────────────────────────
function indexRow(a) {
  const cls = 'article-row';
  const idx = a.index;
  const summary = a.summary
    ? `\n          <span class="row-summary">${escapeHtml(a.summary)}</span>` : '';
  return `      <a class="${cls}" href="blogs/${escapeHtml(a.htmlFile)}"` +
    ` data-title="${escapeHtml(a.title)}"` +
    ` data-summary="${escapeHtml(a.summary)}"` +
    ` data-tags="${escapeHtml(a.tags.join(' '))}">` +
    `\n        <span class="row-index">${idx}</span>` +
    `\n        <span class="row-main">` +
    `\n          <span class="article-title">${escapeHtml(a.title)}</span>` + summary +
    `\n        </span>` +
    `\n        <span class="row-meta">${escapeHtml(a.date)} <span class="row-arrow">↗</span></span>` +
    `\n      </a>`;
}

function updateIndex(articles) {
  let html = fs.readFileSync(INDEX_HTML, 'utf-8');
  const marker = /(<!-- ARTICLES:START -->)[\s\S]*?(<!-- ARTICLES:END -->)/;
  if (!marker.test(html)) {
    throw new Error('index.html 缺少 <!-- ARTICLES:START/END --> 标记，无法更新目录');
  }
  const items = articles.map(indexRow).join('\n');
  html = html.replace(marker, (_, start, end) => `${start}\n${items}\n      ${end}`);
  fs.writeFileSync(INDEX_HTML, html, 'utf-8');
}

// ── 主流程 ──────────────────────────────────────────────────
async function main() {
  const only = process.argv[2];
  const template = fs.readFileSync(TEMPLATE, 'utf-8');

  let mdFiles = fs.readdirSync(BLOGS_DIR)
    .filter(f => f.endsWith('.md') && f !== 'README.md')
    .sort((a, b) => getSort(a) - getSort(b));

  if (only) mdFiles = mdFiles.filter(f => f === only || f === path.basename(only));
  if (mdFiles.length === 0) {
    console.log('blogs/ 目录下没有可生成的文章。');
    return;
  }

  console.log(`发现 ${mdFiles.length} 篇文章，开始生成...\n`);

  const articles = mdFiles.map(file => {
    const filePath = path.join(BLOGS_DIR, file);
    const raw = fs.readFileSync(filePath, 'utf-8');
    const { meta, content } = parseFrontmatter(raw);

    const title = meta.title || file.replace(/\.md$/, '').replace(/^\d+-/, '');
    const date = meta.date || fs.statSync(filePath).mtime.toISOString().slice(0, 10);
    const tags = meta.tags ? meta.tags.split(',').map(s => s.trim()).filter(Boolean) : [];
    const summary = meta.summary || extractSummary(content);
    const htmlFile = file.replace(/\.md$/, '.html');

    return { file, htmlFile, sort: getSort(file), title, date, tags, summary, content, index: '' };
  });

  // 严格按文件名的数字前缀排序，全部条目连续编号 01 / 02，不重排、不跳过
  const ordered = articles.slice().sort((a, b) => a.sort - b.sort);
  ordered.forEach((a, i) => { a.index = String(i + 1).padStart(2, '0'); });

  ordered.forEach((a, i) => {
    const data = {
      TITLE: escapeHtml(a.title),
      DATE: escapeHtml(a.date),
      KIND: `NOTE ${a.index}`,
      TAGS: a.tags.length ? ' ' + a.tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('') : '',
      CONTENT: mdToHtml(a.content),
      NEXT: nextLink(ordered[i + 1])
    };
    fs.writeFileSync(path.join(BLOGS_DIR, a.htmlFile), renderTemplate(template, data), 'utf-8');
    console.log(`  ${a.file} → ${a.htmlFile}`);
  });

  updateIndex(ordered);
  console.log('\n已更新 index.html 目录，完成。');
}

main().catch(err => { console.error(err); process.exit(1); });
