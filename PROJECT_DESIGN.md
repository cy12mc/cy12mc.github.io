# PROJECT_DESIGN — cy12 的数学小组

> 状态：已确认并实施。模式：taste_first_redesign。方向：A 笔记本式阅读。范围：全套同步。
> 用户修订 1：增加圆角，并使用 Apple 超椭圆（连续曲率）而非普通圆弧。
> 用户修订 2：头像改回正圆；笔记页正文改为超椭圆圆角卡片＋单层柔和阴影，宽度随视口/缩放在 (0.8×, 1.3×) 间自适应；删去「上一篇」导航；目录恢复按文件名前缀排序并全部连续编号。
> 用户修订 3：文章内插图（SVG）无论在深色还是浅色主题下，统一使用固定浅色底板，不随 `data-theme` 变化。
> 后续维护：站点已扩充为 4 篇笔记、3 张 SVG；生成器须覆盖全部文章，摘要过滤导出工具写死的 `alt text` 占位词。
> 用户修订 4（章节）：`blogs/` 顶层文件夹按名称处理成章节，默认折叠显示「第N章」，点击展开子文章、再点收回；子文章编号 `1.1 / 1.2…`，眉标 `NOTE 1.1`；嵌套文件夹不再成为章节，其中的文章扁平归入本章；顶层 `.md` 保持 01–04 且排在章节之前。
> 用户修订 5：章节行圆角接入与其他组件相同的超椭圆形状层；展开/收起加入 240ms 高度渐进动画（0fr → 1fr），`prefers-reduced-motion` 下仍归零。

## 1. Product Context

- Product: 托管在 GitHub Pages 的个人数学笔记站，纯静态，无构建步骤。
- Target user: 站主本人与来读数学笔记的同学（桌面为主，手机也会看）。
- Target surface: `index.html` 目录页、`blog-template.html` 生成的文章页、`generate.js` 产出流程。
- Primary job-to-be-done: 找到一篇笔记 → 连续读懂含公式的推导过程。
- Success criteria: 目录可扫读（一眼看出有几篇、讲什么、何时写）；长公式不挤、不糊；主题切换在两页之间一致且持久；新增文章后 UI 不回退；超椭圆圆角在支持的浏览器上是真连续曲率，在不支持的浏览器上仍是体面的圆弧。
- Content/data that must appear: 站点名、签名「想，全是问题；做，才有答案。」、头像、真实标题、真实日期、真实摘要、KaTeX 公式、文章里的引用与例题。
- Interaction requirements: 搜索（标题 + 摘要 + 所属章节，能命中折叠中的子文章）、深浅色切换、返回目录、只保留「下一篇」（无「上一篇」）、**章节默认折叠 / 点击展开 / 再点收回**、键盘可达（Esc / `/`）、hover / focus / 空结果状态。
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
| 插图底板（固定，不随主题） | `#fbfaf8` | `#fbfaf8` |

- 全站只有 1 个彩色（冷蓝）；不出现渐变、彩色背景块、状态色；`color-scheme` 随主题设为 dark / light。
- **`--img-plate: #fbfaf8` 是唯一的例外常量**：SVG 的线条/文字色写死在文件里（`#007799` / `#111111` / `#444444` / `#2c5f8a`），深色主题若套深底会看不清。因此 `html[data-theme="light"]` 不覆盖该变量，深浅两态共用同一块浅底板。

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
- **目录行 `.article-row`**: 整行可点，`padding: 16px 14px`，行间 1px 细分隔线；hover 出现 `--r-card-inner` 的 squircle 淡底；左侧 40px 等宽序号（顶层 `01`–`04` 连续，无站务 `·` 占位；章节内 `1.1` 等）；中部标题 18px/500 + 摘要 14px/muted；右侧日期 12px 等宽 + hover 出现 `↗`；focus-visible 蓝色环。移动端日期隐藏、摘要 2 行截断。
- **章节行 `.chapter-row`（用户修订 4）**: `<button>` 而非链接，`aria-expanded="false"` + `aria-controls="chapter-N"`；左侧「第N章」等宽不换行、与顶层序号共用 40px 列并保持标题左边缘对齐；中部章节名 18px/500 + `N 篇` 12px 等宽 muted；右侧 chevron 展开时旋转 90°；hover / 展开态淡底，focus-visible 蓝环。**圆角走共享 `corner-shape: squircle` 形状层，与文章行同半径 `--r-card-inner`**（用户修订 5）。
- **折叠面板 `.chapter-items`**: 默认 `grid-template-rows: 0fr` + `inert` + `aria-hidden="true"`；点击后面板加 `.is-open`（`1fr`），240ms 高度过渡，箭头同步旋转；内层 `.chapter-items-inner` 负责 `overflow: hidden` 裁剪，高度由内容决定而非 `max-height` 硬编码。子文章 `.article-row.is-in-chapter` 桌面缩进 44px / 移动 22px，编号 `N.M`；`data-chapter="第N章 名称"` 供搜索显示归属。顶层文章在前、章节在后；搜索结果里折叠中的文章也能命中并显示所属章节。
- **正文容器（用户修订）**: `.article .content` 恢复为卡片：surface 面 + 1px 细边 + `--r-card` 超椭圆圆角 + 单层柔和阴影 `--shadow-card`（深 `rgba(0,0,0,.28)` / 浅 `rgba(38,32,22,.11)`），内边距 `32px clamp(24px, 3.2vw, 44px)`；代码块与引用改用 `--bg`，与卡片形成层次。
- **宽度自适应**: `.container.article { width: clamp(612px, 76vw, 984px) }`，基准 760px，上下界约 0.805× / 1.295×，随视口与浏览器页面缩放平滑变化，严格落在 (0.8, 1.3)；≤640px 回退 `width: auto` + 20px padding。首页容器仍为 760px 固定上限。
- **文章插图**: `.content img` 用 `background: var(--img-plate)`（固定 `#fbfaf8`）+ `padding: 10px` + `--r-block` squircle，`max-width: 100%` 防溢出。深浅两态底板一致，只给 SVG 一块浅色「纸面」，不加边框或投影。
- **邻篇导航**: 只输出「下一篇 →」；末篇无内容时 `nav` 为空，用 `:empty` 隐藏，不留空分隔线。
- **章节 h1/h2**: `margin-top: 40px`，底部 1px 细线，`::before` 用 CSS counter 输出 `01 /` 等宽序号。
- **公式块 `.math-display`**: 居中、上下 6px（相邻 `$$` 自动贴合）、`overflow-x: auto`；**不加圆角、底色或编号**，保持公式干净。
- **引用 blockquote**: 表面色 + `--r-block` + squircle + 左侧 2px 强调色细线；正文色而非灰字。
- **代码块 / 行内 code**: 表面色 + `--r-block` / `--r-inline` + squircle；`pre` 横向滚动。
- **搜索对话框**: `role="dialog" aria-modal="true"`；遮罩 `rgba(0,0,0,.62)`；面板 surface 色 + `--r-card` + squircle + 1px 细边；输入框 `--r-control`；结果行 44px 触控高度、squircle hover；空结果一行 muted 文案；Esc 关闭并归还焦点；`/` 打开、↑↓ 选择、Enter 跳转。
- **邻篇链接**: 只保留「下一篇 →」一个 squircle 淡面文字链接，右对齐；末篇无链接，容器 `:empty` 隐藏。
- **主题按钮**: 月亮/太阳图标 + `aria-label` + `aria-pressed`，localStorage 持久化。
- **图标**: 纯线条 SVG，`stroke-width 1.6`，18px，muted 色；只保留搜索 / 主题 / 返回三类。

## 10. Layout Principles

- Spacing scale: 4 / 8 / 12 / 16 / 24 / 40 / 72。容器 `max-width: 760px`，阅读栏 720px，单栏无侧栏。
- Section rhythm: masthead → 32px → 目录标题 → 16px → 目录容器；文章页 容器上边距 48px → 返回 → 28px → 标题/meta → 32px → 正文卡片 → 64px → 邻篇导航；**卡片内首个元素 `margin-top: 0`**，不再和卡片 padding 叠加成一大块空白（用户反馈「页眉太长」）。
- Breakpoints: `≤640px` / `641–1024px` / `>1024px`。移动端 padding 20px、公式与代码块横向滚动、工具按钮 ≥36px。

## 11. Depth, Motion, And Interaction

- Elevation: 0 级页面 + 1 级 surface 面 + 2 级笔记页正文卡片（用户要求的单层柔和阴影 `--shadow-card`）。只用一层阴影，不做多层堆叠；`corner-shape` 让 1px 细边自然贴合曲线。
- Motion: `color` / `background-color` 的 120ms 过渡；**唯一例外是章节展开动画**（用户明确要求）：`grid-template-rows` 0fr → 1fr 的 240ms 高度过渡 + 箭头同步旋转；用 grid 而非 `max-height` 硬编码，内容多少都准确。`prefers-reduced-motion` 下一律归零；仍无位移、缩放、入场动画。
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
  - `blog-template.html`（结构 + `{{KIND}}/{{NEXT}}/{{TAGS}}/{{ROOT}}` + KaTeX 保留；`{{PREV}}` 已删除）
  - `generate.js`（摘要提取、章节扫描与编号、邻篇相对链接、注释标记替换）
  - 新增 `assets/site.css`（token、深浅色、超椭圆体系、章节折叠、全部组件、响应式）
  - 新增 `assets/site.js`（主题、搜索、章节折叠、键盘交互）
  - `blogs/*.html` 由生成器重新产出，共 4 篇（新增 `3-平面直角坐标系` / `4-七上到八上课本`）
- Reuse: KaTeX 渲染函数、frontmatter 解析、`getSort`、占位符函数替换（避免 `$` 破坏公式）。
- Parser: `mdToHtml` 支持尖括号形式的图片/链接目标（路径含空格与括号，编码为 `%20` / `%28` / `%29`）、GFM 表格（含对齐、单元格内公式与粗体）、`####` 四级标题；尖括号形式在 HTML 转义**之前**用占位符保护，表格用逐行扫描合并连续行。
- Summary: `extractSummary` 公式转纯文本后取完整句；图片 alt 若为 `alt text` / `image` 等导出占位词则丢弃；链接文字按原文**直接替换**不插空格，否则「网站托管在[github]上」会变成「在 github 上」。
- Chapters: `blogs/` 顶层文件夹 = 章节，按文件夹名数字前缀排为第1章…；递归收集其中 `.md`（嵌套文件夹不再成为章节、扁平归入本章，按文件名数字前缀 + 相对路径排序）编号为 `1.1 / 1.2…`；顶层 `.md` 仍是 01–04 且排在章节之前。章节文章生成在 md 同级目录，`{{ROOT}} = '../'.repeat(htmlRel.split('/').length)`，「下一篇」按当前文件目录计算相对路径，眉标为 `NOTE N.M`。首页用 `<button aria-expanded/aria-controls>` + `<div class="chapter-items" inert aria-hidden="true"><div class="chapter-items-inner">…</div></div>` 实现可动画折叠（0fr → 1fr，240ms）；搜索读 `data-chapter` 显示归属章节。
- Tokens: 保留 `--bg/--text/--accent`，新增 `--surface/--elevated/--line/--muted` 与 `--r-card/--r-control/--r-block/--r-inline/--card-pad`；`.article-list` 容器 id 保留兼容。
- New: `.article-row`、章节 CSS counter、搜索对话框、只含「下一篇」的邻篇导航、`data-theme` 主题层、squircle 形状层、笔记页卡片阴影层。
- Assets: 头像改用 ASCII 文件名 `avatar.jpg`（规避中文路径在各静态服务/GitHub Pages 上的编码差异），`头像.jpg` 保留为 `onerror` 回退备份；`blogs/` 下 3 张 SVG 由 `encodeAssetPath()` 统一处理路径编码和 `.content img` 统一处理底板；不新增外部图片、不加载 webfont。
- Data: 摘要自动提取；日期取 frontmatter 或文件 mtime；排序严格按文件名数字前缀，全部连续编号，无站务特例、无置底重排。

## 14. Evaluation Plan

- Build: `node --check generate.js`；运行 `node generate.js` 确认 4 篇产出；连续两次运行产物 hash 一致（幂等）。
- Browser/screenshot: 本地静态服务检查首页与文章页；确认无残留 `{{...}}`、KaTeX 正常。
- **圆角专项**: Chromium 下目录容器、笔记页正文卡片、按钮、搜索面板应为连续曲率超椭圆；头像始终正圆；非 Chromium 下为等视觉大小的圆弧；嵌套内外角间距恒定不捏尖；1px 边框完整跟随曲线。
- **宽度专项**: 800 / 1000 / 1280 / 1600px 视口与 80% / 130% 页面缩放下，笔记页卡片宽度应落在 612–984px（0.805×–1.295×）；≤640px 不横向溢出。
- **顺序专项**: 首页按文件名前缀为 01 说明 / 02 函数与函数的应用 / 03 平面直角坐标系 / 04 七上到八上课本；四篇文章眉标依次为 `NOTE 01`–`NOTE 04`，编号连续，无 `·` 占位、无 `SITE / ABOUT`、无「← 上一篇」；末篇 `note-nav` 为空且被 `:empty` 隐藏。
- **章节专项**: 建立临时章节文件夹（含一层嵌套文件夹）后运行生成器：顶层 01–04 仍在最前；章节行显示「第N章 名称 / N 篇」且 `aria-expanded="false"`、面板 `hidden`；子文章按 `1.1 / 1.2…` 缩进，嵌套文件夹里的文章扁平归入本章；点击展开 / 再点收回；搜索「子文章」能命中折叠中的文章并显示所属章节；章节文章资源路径按层级为 `../../` / `../../../`，跨章「下一篇」相对路径正确；「第N章」不换行，桌面与移动端标题左边缘对齐。验证后清理测试数据并重新生成。
- **圆角/动画专项**: 浏览器计算值确认章节行与文章行的 `corner-shape` 同为 `superellipse(2)`、`border-radius` 同为 24px；折叠态 `gridTemplateRows=0px`，展开目标为实际内容高度，`transition-property=grid-template-rows` / `duration=0.24s`；`prefers-reduced-motion` 下过渡归零。
- **内容专项**: 三张 SVG 全部能显示且静态服务 200 `image/svg+xml` —— `exported_image (2).svg` 走尖括号形式编码为 `%20/%28/%29`，`svg-1795230841928.svg` / `svg-1795231201401.svg` 走普通形式；GFM 表格与 `####` 标题正确渲染，无 `|` / `####` 明文残留；首页摘要不含 `alt text` 占位词。
- **插图底板专项**: 深色与浅色主题下，同一篇文章的 SVG 底板必须同为 `#fbfaf8`，深色线条在两态都清晰；`html[data-theme="light"]` 不得覆盖 `--img-plate`。
- Responsive: 375 / 768 / 1280 三档，检查目录行、公式横向滚动、工具按钮不重叠。
- Contrast/readability: 深浅两色正文与 muted 文本；公式不糊不溢出。
- Interaction: hover、focus-visible、搜索空结果、主题跨页持久化、Esc / `/` / ↑↓ / Enter。
- Reference alignment: 出现渐变、pill、绿色/靛紫、阴影堆叠、webfont 即视为回归。
- Better-than-original: 目录信息量、长文阅读节奏、主题一致性、生成器健壮性、圆角几何质量逐条对比。
