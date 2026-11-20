# PROJECT_DESIGN — cy12 的数学小组

> 状态：已确认并实施。模式：taste_first_redesign。方向：A 笔记本式阅读。范围：全套同步。
> 用户修订 1：增加圆角，并使用 Apple 超椭圆（连续曲率）而非普通圆弧。
> 用户修订 2：头像改回正圆；笔记页正文改为超椭圆圆角卡片＋单层柔和阴影，宽度随视口/缩放在 (0.8×, 1.3×) 间自适应；删去「上一篇」导航；目录恢复按文件名前缀排序并全部连续编号。

## 1. Product Context

- Product: 托管在 GitHub Pages 的个人数学笔记站，纯静态，无构建步骤。
- Target user: 站主本人与来读数学笔记的同学（桌面为主，手机也会看）。
- Target surface: `index.html` 目录页、`blog-template.html` 生成的文章页、`generate.js` 产出流程。
- Primary job-to-be-done: 找到一篇笔记 → 连续读懂含公式的推导过程。
- Success criteria: 目录可扫读（一眼看出有几篇、讲什么、何时写）；长公式不挤、不糊；主题切换在两页之间一致且持久；新增文章后 UI 不回退；超椭圆圆角在支持的浏览器上是真连续曲率，在不支持的浏览器上仍是体面的圆弧。
- Content/data that must appear: 站点名、签名「想，全是问题；做，才有答案。」、头像、真实标题、真实日期、真实摘要、KaTeX 公式、文章里的引用与例题。
- Interaction requirements: 搜索（标题 + 摘要）、深浅色切换、返回目录、只保留「下一篇」（无「上一篇」）、键盘可达（Esc / `/`）、hover / focus / 空结果状态。
- Technical constraints: **不加载 webfont、不加动效、不加图片、不加新 CDN 请求**；Markdown → HTML 由 `generate.js` 自研轻量解析器完成；KaTeX 沿用现有 CDN；`generate.js` 会重写首页列表，必须同步。

## 2. Existing UI Read

- Current visual vocabulary: GitHub 深色默认色（`#0d1117` / `#161b22` / `#30363d` / `#58a6ff`）、800px 单栏、14px 圆角卡片、每行一个重复的文件图标。
- Strongest existing cue to preserve: 深色单栏 + 居中阅读栏 + 冷蓝强调 + 那句签名 + 圆形头像 + **原代码里已经写下的 Apple 连续曲率圆角思路**（外层 R_out=14 / 内层 R_in=10 的双层同心环）。
- Components/tokens to reuse: CSS 变量结构、`--bg/--bg2/--border/--text/--text2/--accent` 的命名思路；`.article-item` / `.article-title` 的语义；KaTeX 渲染脚本；`{{TITLE}}/{{DATE}}/{{CONTENT}}/{{TAGS}}` 占位符机制。
- Patterns to preserve: 从真实 DOM 读取文章数据做搜索；`generate.js` 按文件名数字排序；frontmatter 解析；**同心嵌套圆角的思路**（但用正确公式与共享 token 重写）。
- Patterns to evolve: 主题切换从「两个文件各复制一段 JS」改为共享逻辑 + `data-theme` + localStorage；搜索从「只匹配标题、内联样式弹窗」改为带 aria 的对话框 + 摘要匹配；文章正文保留卡片形态，但从普通 14px 圆角升级为超椭圆 + 单层阴影 + 自适应宽度；圆角从「手写 14/10 双层近似」升级为 `corner-shape: squircle` 渐进增强 + 正确的同心公式。
- Patterns to remove or avoid: 每行重复的文件图标；写死在注释里的魔法数值；`position: fixed` 的右上角图标；内联样式堆叠；`{{TAGS}}` 计算了却无处输出。
- Accessibility/state conventions already present: 仅有 hover 变色、Esc 关闭搜索。需补齐：图标按钮 aria-label、focus-visible 环、dialog 语义、焦点返回、reduced-motion。

## 3. Taste Direction

- Product identity sentence: 一本随时翻开的、快而安静的夜间数学笔记本。
- Recommended taste direction: 深色原生介质 + 文档级阅读节奏；层次由序号、等宽技术标签、留白和字重建立，不由卡片网格、阴影和颜色建立。
- Direction to avoid: 暗色仪表盘 / 渐变光晕 / 卡片网格 / 入场动效 / SaaS 模板式 hero / 无节制的大圆角。
- Why this makes the UI more useful: 文章变多后目录能扫读；公式推导有独立呼吸空间；主题与导航不再漂移；所有改进零额外请求。
- What should feel distinctive: `01 / 02` 等宽序号、章节自动编号、`NOTE 01` 技术标签、签名作为副标题、**Apple 式连续曲率圆角（不是圆弧）**、亮色模式带一点纸的暖味。
- What should stay quiet: 头像、图标、边框、任何非交互色块。

### 两处有意识的偏差（需知情）

1. ~~站点说明降级/置底~~（**已撤销**）：用户要求恢复按文件名前缀排序，**所有条目一律连续编号 01 / 02**。不再有 `·` 占位、`SITE / ABOUT` 眉标或站务特殊样式 —— `·` 会被读成「序号加载不出来」，且置底会让顺序与文件名相反。
2. 初案把 squircle 当装饰删掉了，这是判断错误。原代码注释里的外/内半径环正是 Apple 连续曲率的 CSS 近似尝试，属于站点身份线索，保留并升级。

## 4. Selected References

仅取可转译的阅读/层次原则，不取任何品牌特征。

- `mintlify.md`（阅读优化文档）
  - Transferable: 8px 间距体系；正文 16–18px / 1.5–1.8 行高；技术标签用等宽小字；强调色只给交互态。
  - Non-transferable: 白色画布、品牌绿、渐变 hero、16–24px 大圆角、9999px pill、Inter/Geist webfont。
  - Substitution: 深底 `#0d1117`；强调色沿用冷蓝；等宽用系统 `ui-monospace`；圆角改为超椭圆体系。
  - Risk / reject: 任何需要图片、渐变或 webfont 的条目一律拒绝。
- `vercel.md`（黑白精确）
  - Transferable: 400 读 / 500 交互 / 600 标题；颜色克制；分隔线承担结构。
  - Non-transferable: Geist webfont、-2.4px 极端负字距（中文不适用）、shadow-as-border 多层堆叠。
  - Substitution: 系统字体栈；中文不做负字距；用 1px 实线而非阴影。
  - Risk / reject: 只保留「无装饰」原则，不保留具体数值。
- `linear.md`（深色原生介质）
  - Transferable: 近黑背景 + 微透明白分隔线；主文本不用纯白；单一强调色只用于交互。
  - Non-transferable: 品牌靛紫、510 字重、多层阴影栈、command palette 视觉。
  - Substitution: 保留冷蓝 `#6cb6ff`；字重 400/500/600；分隔线 `rgba(255,255,255,.09)`。
  - Risk / reject: 不引入面板、侧栏、状态点。
- **工程依据（非视觉参考）**：CSS `corner-shape` / `superellipse()`，2026-11 现状
  - `corner-shape: squircle` ≡ `superellipse(2)`（Lamé 曲线 n=4），是 iOS 连续曲率角的近似；Apple 真实曲线是三段贝塞尔，不追求逐像素复刻。
  - Chrome / Edge 139+ 支持；Safari / Firefox 未正式支持，会忽略该属性并保留 `border-radius` 圆弧 —— 这是设计好的降级，无需 JS 探测。
  - `corner-shape` 改变的是 border-box 几何，border / outline / overflow / 背景都跟随形状，优于 `clip-path`（会裁掉边框）。
  - 同半径下超椭圆贴角更紧（对角线内切 0.22R vs 圆弧 0.41R），视觉上显得更小；要等效需约 1.8× 半径。
  - 嵌套必须同心：`R_inner = R_outer − gap`，且**内外两层都要单独声明 `corner-shape`（不继承）**。
  - 不使用 SVG mask / clip-path polygon 做全浏览器兜底：会裁掉边框、需要固定尺寸或额外资源，与「零新请求 + 边框跟随几何」冲突。

## 5. Visual Theme & Atmosphere

- Design thesis: 让排版与几何承担全部设计工作。
- Emotional tone: 安静、专注、有一点点程序员式的精确，不冷淡也不热闹。
- Product personality: 个人、手写感（序号与章节编号）、不装作产品。
- First viewport message: 「这是一个数学笔记本，共 N 篇，从这里开始读」——靠目录本身说，不靠标语区块。
- Visual weight priorities: ① 笔记标题与正文公式 ② 目录行 ③ 站点名与签名 ④ 工具图标。

## 6. Color Palette & Roles

深色默认，浅色可选，通过 `html[data-theme]` 切换。

| Role | 深色 | 浅色 |
|---|---|---|
| Page/background | `#0d1117` | `#fbfaf8` |
| Primary surface | `#161c24` | `#f1eee8` |
| Elevated surface（hover / 代码块） | `#1b222c` | `#eae5db` |
| Primary text | `#e6edf3` | `#20242a` |
| Secondary text | `#9aa6b2` | `#5b636c` |
| Muted text | `#6e7b8a` | `#8b8f96` |
| Accent / link / focus | `#6cb6ff` | `#0969da` |
| Border / divider | `rgba(255,255,255,.09)` | `rgba(0,0,0,.11)` |
| Focus ring | `2px solid #6cb6ff` + 2px offset | 用 `#0969da` |

- 全站只有 1 个彩色（冷蓝）；不出现渐变、彩色背景块、状态色；`color-scheme` 随主题设为 dark / light。

## 7. Typography Rules

- Font families: 系统栈 `-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif`；等宽 `ui-monospace, SFMono-Regular, Consolas, "Cascadia Code", monospace`。**不加载 webfont。**
- 站点名 24px / 600 / 1.3 / `-0.01em`；文章 h1 28px / 600；章节 h1/h2 21–23px / 600 / 1.4 + CSS counter 序号；h3 17px / 600。
- Body 17px / 400 / 1.85，阅读栏 720px；目录标题 18px / 500；摘要 14px / 400。
- Labels（日期、序号、NOTE、tags）12–13px 等宽 muted / `letter-spacing .04em`。
- Code 14px 等宽；KaTeX display 1.18em。仅 400 / 500 / 600 三档字重，禁止 700。

## 8. Apple 超椭圆圆角体系（本次修订核心）

### 8.1 Token 分档

半径按「浏览器能力」分两档，保证超椭圆与普通圆弧看起来大小一致：

| Token | 用途 | fallback 圆弧 | `squircle` 下 |
|---|---|---|---|
| `--r-card` | 目录容器、搜索面板、邻篇导航块 | 18px | 30px |
| `--r-control` | 图标按钮、输入框、搜索结果行 | 10px | 17px |
| `--r-block` | 代码块、引用块、tag | 8px | 13px |
| `--r-inline` | 行内 code、小标签 | 5px | 8px |

```css
@supports (corner-shape: squircle) {
  :root { --r-card: 30px; --r-control: 17px; --r-block: 13px; --r-inline: 8px; }
}
```

### 8.2 形状声明

- 所有上述组件统一 `corner-shape: squircle`；不支持的浏览器直接忽略，保留 `border-radius` 圆弧。
- 用一条共享选择器列表声明，避免散落；`border-radius` 单独由各组件引用对应 token。
- `corner-shape` 不继承：嵌套的外层与内层都要显式声明。

### 8.3 同心嵌套

- `R_inner = R_outer − gap`，用 CSS 变量自动推导：`--r-card-inner: calc(var(--r-card) - var(--card-pad))`（`--card-pad: 6px`）。
- 目录容器是外层 squircle 面（1px 细边），内部行的 hover 高亮用 `--r-card-inner`，两条曲线共享圆心，角上间距恒定，不会出现「内角被捏尖」。
- 搜索面板同理；代码块/引用块为单层，无嵌套。

### 8.4 头像

- **按用户要求改回正圆**：`border-radius: 50%`，不参与 `corner-shape`。超椭圆只用于卡片、按钮、代码块、搜索面板等矩形组件。

### 8.5 不用什么

- 不用 `clip-path: polygon/path`、SVG mask、Houdini Paint Worklet、JS 重算路径：会裁边框、需固定尺寸或额外请求。
- 不用 pill（9999px）：胶囊不是超椭圆。
- 不把所有元素都变圆：公式区、正文流、分隔线保持直角，圆角只出现在有明确边界的组件上。

## 9. Component Styling

- **Masthead**: 无背景；头像 56px（移动 44px）；站点名 + 签名上下两行；右侧 36×36 透明图标按钮，`--r-control`，hover 淡底，focus-visible 蓝色环。
- **目录容器 `.card`**: 极淡 surface 面 + 1px 细边 + `--r-card` + squircle，`padding: 6px`；这是圆角的主要载体，不再用整页卡片网格。
- **目录行 `.article-row`**: 整行可点，`padding: 16px 14px`，行间 1px 细分隔线；hover 出现 `--r-card-inner` 的 squircle 淡底；左侧 32px 等宽序号（笔记 `01`，站务 `·`）；中部标题 18px/500 + 摘要 14px/muted；右侧日期 12px 等宽 + hover 出现 `↗`；focus-visible 蓝色环。移动端日期隐藏、摘要 2 行截断。
- **正文容器（用户修订）**: `.article .content` 恢复为卡片：surface 面 + 1px 细边 + `--r-card` 超椭圆圆角 + 单层柔和阴影 `--shadow-card`（深 `rgba(0,0,0,.28)` / 浅 `rgba(38,32,22,.11)`），内边距 `32px clamp(24px, 3.2vw, 44px)`；代码块与引用改用 `--bg`，与卡片形成层次。
- **宽度自适应**: `.container.article { width: clamp(612px, 76vw, 984px) }`，基准 760px，上下界约 0.805× / 1.295×，随视口与浏览器页面缩放平滑变化，严格落在 (0.8, 1.3)；≤640px 回退 `width: auto` + 20px padding。首页容器仍为 760px 固定上限。
- **邻篇导航**: 只输出「下一篇 →」；末篇无内容时 `nav` 为空，用 `:empty` 隐藏，不留空分隔线。
- **章节 h1/h2**: `margin-top: 40px`，底部 1px 细线，`::before` 用 CSS counter 输出 `01 /` 等宽序号。
- **公式块 `.math-display`**: 居中、上下 6px（相邻 `$$` 自动贴合）、`overflow-x: auto`；**不加圆角、底色或编号**，保持公式干净。
- **引用 blockquote**: 表面色 + `--r-block` + squircle + 左侧 2px 强调色细线；正文色而非灰字。
- **代码块 / 行内 code**: 表面色 + `--r-block` / `--r-inline` + squircle；`pre` 横向滚动。
- **搜索对话框**: `role="dialog" aria-modal="true"`；遮罩 `rgba(0,0,0,.62)`；面板 surface 色 + `--r-card` + squircle + 1px 细边；输入框 `--r-control`；结果行 44px 触控高度、squircle hover；空结果一行 muted 文案；Esc 关闭并归还焦点；`/` 打开、↑↓ 选择、Enter 跳转。
- **上一篇/下一篇**: 两个 squircle 淡面文字链接，左右分列，移动端堆叠。
- **主题按钮**: 月亮/太阳图标 + `aria-label` + `aria-pressed`，localStorage 持久化。
- **图标**: 纯线条 SVG，`stroke-width 1.6`，18px，muted 色；只保留搜索 / 主题 / 返回三类。

## 10. Layout Principles

- Spacing scale: 4 / 8 / 12 / 16 / 24 / 40 / 72。容器 `max-width: 760px`，阅读栏 720px，单栏无侧栏。
- Section rhythm: masthead → 32px → 目录标题 → 16px → 目录容器；文章页 返回 → 40px → 标题/meta → 48px → 正文 → 64px → 邻篇导航。
- Breakpoints: `≤640px` / `641–1024px` / `>1024px`。移动端 padding 20px、公式与代码块横向滚动、工具按钮 ≥36px。

## 11. Depth, Motion, And Interaction

- Elevation: 0 级页面 + 1 级 surface 面 + 2 级笔记页正文卡片（用户要求的单层柔和阴影 `--shadow-card`）。只用一层阴影，不做多层堆叠；`corner-shape` 让 1px 细边自然贴合曲线。
- Motion: 仅 `color` / `background-color` 的 120ms 过渡；`prefers-reduced-motion` 下归零；无位移、缩放、入场动画。
- Touch targets: 图标按钮 ≥36px、目录行 ≥56px、搜索结果行 ≥44px。

## 12. Do's And Don'ts

### Do
- 用序号、日期、摘要、章节编号建立层次。
- 用 `corner-shape: squircle` + `@supports` 分档半径实现连续曲率，并让嵌套圆角同心。
- 把主题与搜索逻辑抽到共享文件，消除两份重复脚本。
- 主题用 `data-theme` + localStorage + head 内同步引导脚本防闪烁。
- 生成器用 `<!-- ARTICLES:START/END -->` 注释标记替换列表。
- 摘要从 Markdown 首段自动提取，不造内容。

### Don't
- 不加渐变、光晕、动效、webfont、新图片、新 CDN 请求。
- 不造 hero、统计数字、标签云、假数据或空分组。
- 不用 pill 徽章、卡片网格，也不给公式块加圆角底色。
- 不用 clip-path / SVG mask / JS 路径重算来「强行全浏览器一致」。
- 不改 Markdown 正文内容，不改文章文件名与排序规则。
- 不在中文上套极端负字距。

## 13. Implementation Mapping

- Files:
  - `index.html`（结构 + head 防闪烁引导脚本）
  - `blog-template.html`（结构 + `{{KIND}}/{{NEXT}}/{{TAGS}}` + KaTeX 保留；`{{PREV}}` 已删除）
  - `generate.js`（摘要提取、站务识别、邻篇链接、注释标记替换）
  - 新增 `assets/site.css`（token、深浅色、超椭圆体系、全部组件、响应式）
  - 新增 `assets/site.js`（主题、搜索、键盘交互）
  - `blogs/*.html` 由生成器重新产出，共 2 篇
- Reuse: KaTeX 渲染函数、frontmatter 解析、`getSort`、占位符函数替换（避免 `$` 破坏公式）。
- Parser: `mdToHtml` 支持尖括号形式的图片/链接目标（路径含空格与括号，编码为 `%20` / `%28` / `%29`）、GFM 表格（含对齐、单元格内公式与粗体）、`####` 四级标题；尖括号形式在 HTML 转义**之前**用占位符保护，表格用逐行扫描合并连续行。
- Tokens: 保留 `--bg/--text/--accent`，新增 `--surface/--elevated/--line/--muted` 与 `--r-card/--r-control/--r-block/--r-inline/--card-pad`；`.article-list` 容器 id 保留兼容。
- New: `.article-row`、章节 CSS counter、搜索对话框、只含「下一篇」的邻篇导航、`data-theme` 主题层、squircle 形状层、笔记页卡片阴影层。
- Assets: 头像改用 ASCII 文件名 `avatar.jpg`（规避中文路径在各静态服务/GitHub Pages 上的编码差异），`头像.jpg` 保留为 `onerror` 回退备份；不新增图片、不加载 webfont。
- Data: 摘要自动提取；日期取 frontmatter 或文件 mtime；排序严格按文件名数字前缀，全部连续编号，无站务特例、无置底重排。

## 14. Evaluation Plan

- Build: `node --check generate.js`；运行 `node generate.js` 确认 2 篇产出。
- Browser/screenshot: 本地静态服务检查首页与文章页；确认无残留 `{{...}}`、KaTeX 正常。
- **圆角专项**: Chromium 下目录容器、笔记页正文卡片、按钮、搜索面板应为连续曲率超椭圆；头像始终正圆；非 Chromium 下为等视觉大小的圆弧；嵌套内外角间距恒定不捏尖；1px 边框完整跟随曲线。
- **宽度专项**: 800 / 1000 / 1280 / 1600px 视口与 80% / 130% 页面缩放下，笔记页卡片宽度应落在 612–984px（0.805×–1.295×）；≤640px 不横向溢出。
- **顺序专项**: 首页按文件名前缀为 01 说明 / 02 函数，两篇文章眉标分别为 `NOTE 01` / `NOTE 02`，无 `·` 占位、无 `SITE / ABOUT`、无「← 上一篇」。
- **内容专项**: 文章内 `exported_image (2).svg` 能正常显示（`<img src="exported_image%20%282%29.svg">`、静态服务 200 `image/svg+xml`）；GFM 表格与 `####` 标题正确渲染，无 `|` / `####` 明文残留。
- Responsive: 375 / 768 / 1280 三档，检查目录行、公式横向滚动、工具按钮不重叠。
- Contrast/readability: 深浅两色正文与 muted 文本；公式不糊不溢出。
- Interaction: hover、focus-visible、搜索空结果、主题跨页持久化、Esc / `/` / ↑↓ / Enter。
- Reference alignment: 出现渐变、pill、绿色/靛紫、阴影堆叠、webfont 即视为回归。
- Better-than-original: 目录信息量、长文阅读节奏、主题一致性、生成器健壮性、圆角几何质量逐条对比。
