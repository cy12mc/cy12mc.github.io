/**
 * generate.js — 一键生成博客文章 HTML
 *
 * 用法：
 *   node generate.js              # 扫描 blogs/ 下所有 .md 文件并生成对应 HTML
 *   node generate.js 文件名.md    # 只生成指定文件
 *
 * 文件命名规则：
 *   文件名以数字开头 + 连字符，例如：
 *     1-说明.md      → 按 1 排序
 *     10-新文章.md   → 按 10 排序
 *   没有前缀数字的，排在最后（sort: 999）
 */

const fs = require('fs');
const path = require('path');

const BLOGS_DIR = path.join(__dirname, 'blogs');
const TEMPLATE = path.join(__dirname, 'blog-template.html');
const INDEX_JS = path.join(__dirname, 'index.html');

// ── Markdown → HTML（轻量实现，带占位符保护） ─────────────────
// 先保护代码块/行内代码/数学公式，再处理其他 markdown，最后还原
// 所有保护项都存入同一个数组，用唯一的 \x00N\x00 标记
function mdToHtml(md) {
  const store = [];
  const protect = (frag) => (store.push(frag), `\x00${store.length - 1}\x00`);

  // 1) 代码块
  let html = md.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) =>
    protect(`<pre><code class="language-${lang}">${code.trim()}</code></pre>`));
  // 2) 行内代码
  html = html.replace(/`([^`\n]+)`/g, (_, code) => protect(`<code>${code}</code>`));
  // 3) 数学公式（先块级，再行级；占位符在转义前生成，所以 tex 保持原样）
  html = html.replace(/\$\$([\s\S]+?)\$\$/g, (_, tex) =>
    protect(`<div class="math-display"><span class="math" data-tex="${encodeURIComponent(tex.trim())}"></span></div>`));
  html = html.replace(/\$([^$\n]+?)\$/g, (_, tex) =>
    protect(`<span class="math" data-tex="${encodeURIComponent(tex.trim())}"></span>`));

  // 4) 转义剩余 html 特殊字符
  html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // 5) 标题
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // 6) 粗体/斜体
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // 7) 引用
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');

  // 8) 分隔线
  html = html.replace(/^---$/gm, '<hr>');

  // 9) 图片
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');

  // 10) 链接
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // 11) 无序列表
  html = html.replace(/^[\-\*] (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

  // 12) 有序列表
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

  // 13) 段落（占位符开头的行不包裹）
  html = html.replace(/^(?!<[huplbod]|<\/|<pre|<code|<img|<hr|<blockquote|\x00)(.+)$/gm, '<p>$1</p>');
  html = html.replace(/<p>\s*<\/p>/g, '');

  // 14) 还原所有保护项
  html = html.replace(/\x00(\d+)\x00/g, (_, i) => store[+i]);

  return html;
}

// ── 解析 frontmatter ─────────────────────────────────────────
function parseFrontmatter(raw) {
  const fm = {};
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { meta: {}, content: raw };

  const body = match[2];
  const lines = match[1].split('\n');
  for (const line of lines) {
    const [k, ...vParts] = line.split(':');
    if (k && vParts.length) fm[k.trim()] = vParts.join(':').trim();
  }
  return { meta: fm, content: body };
}

// ── 从文件名提取 sort 数字 ───────────────────────────────────
function getSort(filename) {
  const m = filename.match(/^(\d+)/);
  return m ? parseInt(m[1], 10) : 999;
}

// ── 读取模板并替换占位符 ─────────────────────────────────────
// content 中可能含有数学公式的 \n 等，String.replace 的 $ 模式替换符会破坏它，
// 用函数替换可完全避免
function renderTemplate(template, { title, date, tags, content }) {
  let html = template
    .replace(/{{TITLE}}/g, () => title)
    .replace(/{{DATE}}/g, () => date)
    .replace(/{{CONTENT}}/g, () => content);

  const tagsHtml = tags
    .map(t => `<span class="tag">${t}</span>`)
    .join('');
  html = html.replace(/{{TAGS}}/g, () => tagsHtml);

  return html;
}

// ── 主流程 ───────────────────────────────────────────────────
async function main() {
  // 读取模板
  const template = fs.readFileSync(TEMPLATE, 'utf-8');

  // 收集文章
  const mdFiles = fs.readdirSync(BLOGS_DIR)
    .filter(f => f.endsWith('.md') && f !== 'README.md')
    .sort((a, b) => getSort(a) - getSort(b));

  if (mdFiles.length === 0) {
    console.log('📭 blogs/ 目录下没有文章文件（跳过 README.md）。');
    console.log('   新建文章示例：echo "标题" > blogs/1-新文章.md');
    return;
  }

  console.log(`🚀 发现 ${mdFiles.length} 篇文章，开始生成...\n`);

  const articles = [];

  for (const file of mdFiles) {
    const filePath = path.join(BLOGS_DIR, file);
    const raw = fs.readFileSync(filePath, 'utf-8');
    const { meta, content } = parseFrontmatter(raw);

    const title   = meta.title || file.replace(/\.md$/, '').replace(/^\d+-/, '');
    const date    = meta.date || new Date().toISOString().slice(0, 10);
    const tagsRaw = meta.tags ? meta.tags.split(',').map(s => s.trim()) : [];
    const tags    = tagsRaw.length ? tagsRaw : [file.replace(/^\d+-/, '')];

    const htmlContent = mdToHtml(content);
    const htmlFile    = file.replace('.md', '.html');
    const htmlPath    = path.join(__dirname, 'blogs', htmlFile);

    const html = renderTemplate(template, { title, date, tags, content: htmlContent });
    fs.writeFileSync(htmlPath, html, 'utf-8');

    console.log(`  ✅ ${file} → ${htmlFile}`);
    articles.push({ sort: getSort(file), title, file: `blogs/${file}` });
  }

  // 更新 index.html 中的文章列表
  updateIndex(articles);
  console.log('\n✅ 已更新 index.html');
  console.log('\n🎉 完成！在浏览器打开 index.html 即可查看博客。');
}

// ── 更新 index.html 文章列表 ─────────────────────────────────
async function updateIndex(articles) {
  let indexHtml = fs.readFileSync(INDEX_JS, 'utf-8');

  // 构建 article-list 部分（不含标签/日期）
  const items = articles.map(a => `
    <a class="article-item" href="${a.file.replace('.md', '.html')}">
      <svg class="article-icon" viewBox="0 0 16 16"><path d="M0 1.75C0 .784.784 0 1.75 0h12.5C15.216 0 16 .784 16 1.75v12.5A1.75 1.75 0 0 1 14.25 16H1.75A1.75 1.75 0 0 1 0 14.25zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h12.5a.25.25 0 0 0 .25-.25V1.75a.25.25 0 0 0-.25-.25z"/><path d="M3 5.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zm0 2.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5z"/></svg>
      <span class="article-title">${a.title}</span>
    </a>`).join('');

  // 替换<article-list>...</article-list>（或用正则匹配 div.article-list）
  indexHtml = indexHtml.replace(
    /(<div class="article-list" id="articleList">)[\s\S]*?(<\/div>)/,
    `$1\n${items}\n  $2`
  );

  fs.writeFileSync(INDEX_JS, indexHtml, 'utf-8');
}

main().catch(err => { console.error(err); process.exit(1); });
