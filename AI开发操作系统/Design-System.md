# DataSphere Design System v4.2

> 基于 `frontend-design`（Anthropic 反 AI slop 审美指南）和 `ui-ux-pro-max`（社区设计知识库）的思路，从现有产品 UI 中抽象的设计系统文档。
> 用途：后续功能迭代、生产环境移植、Cursor 前端开发的强约束输入。

---

## 一、设计方向定位

| 维度       | 选择                                                                       |
|------------|----------------------------------------------------------------------------|
| 产品类型   | B 端数据智能平台（NL2SQL + 数据治理 + 异常归因）                            |
| 设计调性   | **Warm Utility** — 暖色系工具感，不冷酷也不花哨，介于 SaaS Dashboard 与 AI Chat 之间 |
| 差异化记忆点 | 橙金渐变品牌色 + 对话式交互 + SQL 代码窗口                                 |
| 反 AI slop  | 不使用 Inter/紫色渐变/三列等距卡片/emoji 图标                              |

---

## 二、Design Tokens（:root 变量）

### 2.1 配色体系

```
品牌主色体系（60-30-10 法则）
├── 60% 基底  →  #fafafa (page bg) / #ffffff (card bg)
├── 30% 文字  →  #1f2937 (primary) / #6b7280 (secondary) / #9ca3af (tertiary)
└── 10% 强调  →  #ff6b35 (brandOrange) / #f7b731 (brandYellow)
```

| Token                   | 值                                                     | 用途               |
|-------------------------|--------------------------------------------------------|--------------------|
| `--color-bg-page`       | `#fafafa`                                              | 页面底色            |
| `--color-bg-card`       | `#ffffff`                                              | 卡片/面板底色       |
| `--color-border`        | `#e5e7eb`                                              | 通用边框            |
| `--brand-orange`        | `#ff6b35`                                              | 品牌主色（按钮/高亮）|
| `--brand-yellow`        | `#f7b731`                                              | 品牌辅色（渐变终点） |
| `--brand-gradient`      | `linear-gradient(135deg, #ff6b35 0%, #f7b731 100%)`    | 品牌渐变（Logo/发送按钮/用户气泡/表头） |
| `--success`             | `#22c55e`                                              | 成功状态            |
| `--warning`             | `#eab308`                                              | 警告状态            |
| `--danger`              | `#ef4444`                                              | 错误/危险           |
| `--info`                | `#3b82f6`                                              | 信息/上传区蓝色     |

**配色设计原则**：
- 橙金渐变 **仅用于** 品牌标识（Logo `DS`、侧边栏激活项、发送按钮、用户消息气泡、数据表头）
- 页面大面积留白 `#fafafa`，避免视觉噪音
- 交互状态统一使用 `orange-50 → orange-100` 浅色过渡，不引入新色调
- 功能色（蓝/绿/红/黄）仅出现在对应语义场景，不用于装饰

### 2.2 字体体系

| Token              | 值                                                                                     | 用途           |
|--------------------|----------------------------------------------------------------------------------------|---------------|
| `--font-sans`      | `'Noto Sans SC', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', ...`   | 全局正文       |
| `--font-mono`      | `'Monaco', 'Consolas', 'Courier New', monospace`                                       | SQL 代码/技术标签 |

**字号层级**（5 级）：

| Level   | Token          | 值     | 应用场景                               |
|---------|----------------|--------|---------------------------------------|
| XL      | `--text-xl`    | 18px   | 欢迎标题                              |
| LG      | `--text-lg`    | 16px   | 面板标题                              |
| Base    | `--text-base`  | 14px   | 正文、输入框、消息气泡、SQL 窗口内容   |
| SM      | `--text-sm`    | 12px   | 次要文案、Chip、表头、SQL 标题         |
| XS      | `--text-xs`    | 10px   | 辅助信息、思考链、小标签、时间戳       |

**字重规范**：
- `font-bold (700)`：标题、品牌名、发送按钮
- `font-semibold (600)`：表头、分区标签
- `font-medium (500)`：消息正文、卡片文字、导航项
- `font-normal (400)`：辅助文案、placeholder

### 2.3 阴影体系

| Token            | 值                                           | 应用场景             |
|------------------|----------------------------------------------|---------------------|
| `--shadow-card`  | `0 4px 20px -2px rgba(0, 0, 0, 0.05)`       | 内容卡片             |
| `--shadow-btn`   | `0 1px 2px 0 rgba(0, 0, 0, 0.05)`           | 按钮/Chip            |
| `--shadow-brand` | `0 10px 25px -5px rgba(255, 107, 53, 0.3)`  | 品牌元素（Logo/激活态导航）|

### 2.4 间距系统

| Token         | 值    |
|---------------|-------|
| `--space-4`   | 4px   |
| `--space-8`   | 8px   |
| `--space-12`  | 12px  |
| `--space-16`  | 16px  |
| `--space-24`  | 24px  |
| `--space-32`  | 32px  |

### 2.5 圆角规范

| 场景       | 圆角值        | Tailwind 类   |
|------------|--------------|---------------|
| 大容器/弹窗 | 16px         | `rounded-2xl` |
| 卡片/输入框 | 16-20px      | `rounded-2xl` |
| 按钮/标签  | 12px         | `rounded-xl`  |
| 小元素/Chip | 9999px (pill) | `rounded-full`|
| SQL 窗口   | 16px         | `rounded-2xl` |

---

## 三、布局架构

### 3.1 全局结构

```
┌──────────────────────────────────────────────────┐
│ Login View (全屏居中表单)                         │
├──────────────────────────────────────────────────┤
│ Main App (flex h-screen)                         │
│ ┌─────────┬──────────────────────────────────┐   │
│ │ Sidebar │  Content Area                    │   │
│ │ w-64    │  flex-1 overflow-hidden          │   │
│ │         │  ┌──────────────────────────────┐ │   │
│ │  Logo   │  │ Tab Content (各功能页面)     │ │   │
│ │  Nav    │  │                              │ │   │
│ │  items  │  │  ┌──────────────────────┐    │ │   │
│ │         │  │  │  Chat Area (对话流)   │    │ │   │
│ │         │  │  │  scroll-y            │    │ │   │
│ │         │  │  └──────────────────────┘    │ │   │
│ │         │  │  ┌──────────────────────┐    │ │   │
│ │  User   │  │  │  Input Bar (固定底部) │    │ │   │
│ │  info   │  │  │  max-w-4xl mx-auto   │    │ │   │
│ │         │  │  └──────────────────────┘    │ │   │
│ └─────────┴──┴──────────────────────────────┘ │   │
└──────────────────────────────────────────────────┘
```

**侧边栏**：`w-64` 固定宽度，白底 + 右边框 `border-gray-100`，内部 `p-4` 间距

**内容区**：`flex-1`，各 Tab 页通过 `display:none/flex` 切换

### 3.2 智能问数页布局

```
Content Area
├── Header Bar (顶部导航/用户信息)
├── Chat Area (flex-1, 垂直滚动)
│   ├── Welcome Screen (居中欢迎 + 示例卡片网格)
│   │   ├── Brand Icon (gradient-main, w-16 h-16)
│   │   ├── Title + Subtitle
│   │   └── Example Cards Grid (2×2 per category)
│   └── Message Stream
│       ├── User Bubble (右对齐)
│       ├── AI Response (左对齐, 含推理/SQL/结果)
│       ├── Event Confirm Bubble (左对齐, 交互卡片)
│       └── ...
└── Input Container (sticky bottom)
    └── Input Wrapper (max-w-4xl, 居中)
        ├── Context Area (附件/框选结果)
        ├── Textarea (自适应高度)
        ├── Chips Bar (已隐藏)
        └── Toolbar (左: 工具按钮 | 右: 发送按钮)
```

---

## 四、组件库

### 4.1 品牌标识 · Logo

```
┌──────────┐
│    DS    │  gradient-main + rounded-xl/2xl + shadow-glow
│          │  尺寸：w-12 h-12 (登录页) / w-10 h-10 (侧边栏)
└──────────┘
```

- 文字 `DS`，白色 bold
- 背景：`var(--brand-gradient)`（135° 橙金渐变）
- 辉光阴影：`shadow-glow`

### 4.2 导航项 · Nav Item

**静默态**：
```
[icon]  文字          text-gray-500
                      hover: bg-orange-50 + text-brandOrange
                      rounded-2xl, px-4 py-3.5
```

**激活态**：
```
[icon]  文字          gradient-main + text-white
                      shadow-glow
                      rounded-2xl
```

### 4.3 消息气泡

**用户消息**（右对齐）：
```
                        ┌─────────────────┐ ┌────┐
                        │ 用户输入文本     │ │ 👤 │
                        │ gradient-main    │ │头像 │
                        │ text-white       │ └────┘
                        │ rounded-2xl      │
                        │ rounded-tr-sm ↗  │
                        └─────────────────┘
                              10:30
```
- 背景：`gradient-main`
- 圆角：`rounded-2xl rounded-tr-sm`（右上角小圆角，营造气泡感）
- 最大宽度：`max-w-lg`
- 阴影：`shadow-lg shadow-orange-200/50`

**AI 消息**（左对齐）：
```
┌────┐ ┌──────────────────────────────┐
│ 🤖 │ │ AI 回复内容                  │
│渐变 │ │ bg-white                    │
│头像 │ │ border: rgba(249,115,22,.12)│
└────┘ │ rounded-2xl rounded-tl-sm   │
       └──────────────────────────────┘
  10:31
```
- 头像：`w-10 h-10 rounded-2xl gradient-main`（橙金渐变方形头像）
- 卡片：白底 + 极淡橙色边框
- 内部可嵌套：推理块、SQL 窗口、数据表格、交互确认

### 4.4 推理/思考块 · Thought Block

```
┌─ ✨ 推理过程 ─────────────────────────┐  ← 可折叠 header
│  bg-gray-100 / border-bottom          │
├───────────────────────────────────────┤
│  步骤内容                              │  ← text-xs, text-secondary
│  max-height: 180px, overflow-auto      │
│  bg-white                              │
└───────────────────────────────────────┘
```

### 4.5 SQL 窗口 · SQL Window

```
┌── generated_query.sql ──── [Copy] [Run] ──┐  ← sql-window-header
│  bg-gray-100, font-mono text-sm           │     h-38px
├───────────────────────────────────────────┤
│  SELECT                                   │  ← sql-window-content
│      dt,                                  │     bg-[#faf8f5] (暖灰)
│      COUNT(*) AS cnt                      │     font-mono, text-[12.5px]
│  FROM dwd.dwd_log_action_front            │     min-h-220px
│  WHERE ...                                │
├───────────────────────────────────────────┤
│  [查看结果] [对比] [修正]                  │  ← sql-window-footer
│  bg-gray-50                               │     border-top
└───────────────────────────────────────────┘
```

- 容器：`rounded-2xl shadow-card bg-white`
- SQL 代码区背景：`#faf8f5`（暖米色，区分于纯白）
- 字体：`var(--font-mono)`

### 4.6 数据结果表格 · Result Table

```
┌────────────┬─────────┬─────────┐
│ dt         │ dau     │ rate    │  ← thead: gradient-main + white text
├────────────┼─────────┼─────────┤     font-semibold, uppercase, tracking
│ 2026-03-28 │ 12,345  │ 5.2%   │  ← tbody: text-gray-700
│ 2026-03-29 │ 13,012  │ 5.5%   │     hover: bg-yellow-50 (#fef3c7)
│ 2026-03-30 │ 12,890  │ 5.3%   │     border-bottom per row
└────────────┴─────────┴─────────┘
```

### 4.7 埋点事件确认卡片 · Event Confirm

```
┌────┐ ┌──────────────────────────────────────────┐
│ 💬 │ │ 嘿，这个功能对应好几个埋点事件，可以多选  │
│渐变 │ │ 哦～点击选中，hover 右边的 [?] 看截图确认│
│头像 │ │                                          │
└────┘ │ ┌────────────────────────────────┬───┐    │
       │ │ [✓] 事件描述文本               │ ? │←hover│
       │ │     sub_desc 补充              │   │  出图│
       │ └────────────────────────────────┴───┘    │
       │ ┌────────────────────────────────┬───┐    │
       │ │     事件描述文本               │ ? │    │
       │ └────────────────────────────────┴───┘    │
       │                                          │
       │ [          确认选择 (2)           ]       │
       │ ┌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┐          │
       │ ╎ emmm 都不太对，帮我反馈一下   ╎          │
       │ └╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┘          │
       └──────────────────────────────────────────┘
```

**候选卡片**：
- 静默态：`border border-gray-200 rounded-xl p-3`
- hover：`border-orange-300 bg-orange-50/40`
- 选中态：`ring-2 ring-orange-400 bg-orange-50/60` + 右侧橙色 ✓ badge

**? 热区**（截图预览触发器）：
- `w-6 h-6 rounded-full bg-orange-100 text-orange-500 font-bold`
- **不改变光标形态**：`cursor-default`
- hover 弹出截图 popup 在选项 **右侧**：`left:calc(100% + 10px)`, `transform:translateY(-50%)`
- popup：`bg-white rounded-xl shadow-2xl border p-1.5 pointer-events-none`

**确认按钮**：
- `bg-orange-500 text-white rounded-xl`（**纯色，无渐变**）
- `hover:bg-orange-600`
- 选中数量 > 0 时显示

**反馈兜底**：
- 虚线边框：`border-dashed border-gray-200`
- hover：`border-orange-200 bg-orange-50/20`
- 点击后原地变为 `✓ 已反馈，感谢～`（绿色文字）并禁用

### 4.8 输入框 · Chat Input

```
┌──────────────────────────────────────────┐
│  [附件区: 页面框选 / 上传文件标签]        │ ← hidden by default
│  ┌──────────────────────────────────────┐ │
│  │ 输入您的数据查询需求...              │ │ ← textarea, auto-grow
│  │                                      │ │    max-h-32
│  └──────────────────────────────────────┘ │
│  [📎上传] [</>SQL]              [发送 →] │ ← toolbar
└──────────────────────────────────────────┘
```

- 外框：`bg-white border border-gray-200 rounded-2xl shadow-2xl`
- focus 态：`border-orange-200 ring-4 ring-orange-50 shadow-orange-100`
- 发送按钮：`gradient-main text-white rounded-xl shadow-lg shadow-orange-200/50`
- disabled：`opacity-40 bg-gray-300 cursor-not-allowed`
- 底部 disclaimer：`text-[10px] text-gray-300`

### 4.9 快速查询卡片 · Example Card

```
┌─────────────────────────────────────┐
│  [📈]  分析本周 SeaArt 创作任务量     │
│  icon   变化趋势                     │
│  38×38                               │
│  rounded-[10px]                      │
└─────────────────────────────────────┘
```

- 整体：`h-64px border rounded-2xl shadow-btn`
- icon 区：`w-38 h-38 rounded-[10px]`，对应功能色底（orange-50/purple-50）
- hover：`border-brandOrange + translateY(-1px) + orange shadow`
- 文字：`--text-card (13px), font-medium, line-clamp-2`

### 4.10 Chip / 标签 · Query Chip

- `h-24px rounded-full bg-gray-100`
- hover：`bg-[#fff7f4] border-brandOrange text-brandOrange`
- 用于快速筛选标签

### 4.11 弹窗 · Modal

```
┌─ 背景蒙版 ──────────────────────────┐
│  bg-black/30 backdrop-blur-[1px]     │
│  ┌────────────────────────────────┐  │
│  │  Header (gradient 或 solid)    │  │  ← gradient-main or bg-gradient-to-r
│  │  Content (scroll-y)            │  │
│  │  Footer (optional)             │  │
│  └────────────────────────────────┘  │
│  rounded-2xl shadow-2xl              │
│  max-h-85vh                          │
└──────────────────────────────────────┘
```

### 4.12 拖拽上传浮层 · Drag Drop Overlay

- 触发态：`border: 2.5px dashed #3b82f6`（蓝色虚线）
- 背景：`rgba(255,255,255,0.92) backdrop-blur(6px)`
- icon：`linear-gradient(135deg, #eff6ff, #dbeafe)` + `color: #3b82f6`
- 入场动画：`dragBounce 0.35s ease-out`

### 4.13 工具栏图标按钮 · Toolbar Icon Btn

- `w-32 h-32 rounded-lg border-transparent`
- hover：`bg-gray-50 border-gray-200 text-brandOrange`

### 4.14 Toast 通知

- 位置：`fixed top-6 left-1/2 -translate-x-1/2 z-200`
- 样式：`px-6 py-3 rounded-xl shadow-lg border`
- 类型色：success(绿) / warning(黄) / error(红) / info(蓝)
- 入场：`animate-fade-in`

---

## 五、动效规范

| 动效名                | 属性                                                 | 时长       | 应用场景           |
|-----------------------|-----------------------------------------------------|------------|-------------------|
| `fadeInUp`            | `opacity: 0→1, translateY: 10px→0`                  | 0.4s ease-out | 消息气泡入场       |
| `fadeInPanel`         | `opacity: 0→1, translateY: 4px→0`                   | 0.2s ease-out | 面板/下拉展开      |
| `slideInRight`        | `opacity: 0→1, translateX: 12px→0`                  | 0.3s ease-out | 用户消息入场       |
| `slideInLeft`         | `opacity: 0→1, translateX: -12px→0`                 | 0.3s ease-out | AI 消息入场        |
| `bounce-slow`         | `translateY: -5%↔5%`                                | 3s infinite   | 等待态装饰         |
| `dragBounce`          | `opacity: 0→1, translateY: 8px→0, scale: 0.96→1`   | 0.35s ease-out| 拖拽浮层           |
| `active:scale-[0.98]` | 按下缩小                                              | instant    | 所有可点击元素     |
| `transition-all`      | 通用过渡                                              | 0.2-0.3s   | 状态变化           |

**动效原则**：
- 入场动画短而克制（0.2s-0.4s），不使用弹跳或过度缓动
- 交互反馈用 `active:scale-[0.98]`，微妙但有存在感
- hover 状态用 `transition-colors` / `transition-all`，200ms
- 长等待用 `animate-spin`（加载器）或 `animate-bounce-slow`（装饰）
- 尊重 `prefers-reduced-motion`（待完善）

---

## 六、交互模式

### 6.1 对话流交互

```
用户输入 → Enter 发送
         ↓
    [推理步骤流式展示] ← SSE 逐步推送
         ↓
    ┌── 分支判断 ──┐
    │              │
  正常结果      需要确认
  (SQL+表格)    (埋点匹配)
                   ↓
              多选卡片 + 确认
                   ↓
              注入上下文 → 重新生成
```

### 6.2 埋点事件确认流程

1. 系统检测到查询涉及前端埋点事件
2. **仅阻断 SQL 生成**，不阻断前置推理
3. AI 气泡展示候选列表，支持：
   - 多选（toggle 选中/取消）
   - `?` 热区 hover 查看截图（右侧弹出）
   - 确认提交选中项
   - 反馈兜底（点击后显示已反馈，不跳转）
4. 选中的 `entity_name` / `entity_type` / `front_operation` 注入 SQL 生成上下文

### 6.3 文件上传交互

```
拖拽文件 → 蓝色虚线浮层出现
        → 放入区域 → 解析 → 上下文标签出现在输入框上方
        → 放到区域外 → 浮层消失，恢复原始输入框样式
按钮上传 → 点击 📎 → 系统文件选择器
```

### 6.4 输入框状态机

```
Empty (disabled 发送)
  ↓ 输入文字
Has Content (enabled 发送, 可 Enter 提交)
  ↓ 发送
Loading (spinner, disabled)
  ↓ 完成
Empty
```

---

## 七、Anti-Patterns 检查清单

基于 `frontend-design` 和 `ui-ux-pro-max` 的交付前验证：

### 7.1 审美

- [x] 不使用 Inter / Roboto / Arial 作为正文字体 → 使用 **Noto Sans SC**
- [x] 不使用紫色渐变 + 白色背景组合 → 使用 **橙金渐变**
- [x] 不使用 emoji 作为功能图标 → 使用 **SVG inline icon**
- [x] 不使用无意义的三列等距卡片 → 示例卡片按功能分组（2×2 网格）
- [ ] 所有 icon 建议统一为一套风格的 SVG stroke icon（当前已基本统一）

### 7.2 可用性

- [x] 所有可点击元素有 `cursor-pointer`
- [x] `?` 热区特殊处理：`cursor-default`（不改变光标，避免误导）
- [x] hover 状态不导致布局抖动（使用 `border` 而非增加 padding）
- [x] 消息区域可滚动，新消息自动滚底（`scrollTo smooth`）
- [x] 输入框自适应高度（`oninput` 调整 scrollHeight）
- [x] disabled 状态有明确视觉区分（`opacity-40 cursor-not-allowed`）

### 7.3 容错

- [x] 拖拽上传在区域外释放时正确恢复（`dragleave` + `dragend` 兜底）
- [x] SSE 流式中断有错误兜底 UI
- [x] JSON `NaN` 安全序列化
- [x] 反馈按钮点击后不可重复操作

### 7.4 待改进项

- [ ] 暗色模式支持
- [ ] `prefers-reduced-motion` 媒体查询
- [ ] 移动端响应式布局（当前仅适配桌面端）
- [ ] Tailwind CDN 生产环境替换（当前使用 CDN，应改为 PostCSS 构建）
- [ ] 图片 alt 文字补全

---

## 八、文件结构

| 文件                   | 职责                                 |
|------------------------|-------------------------------------|
| `index.html`           | 页面结构 + 所有 JS 逻辑（单文件 SPA）|
| `smart-query.css`      | Design Tokens + 组件样式             |
| `tailwind CDN`         | 实用类基础                           |
| `Noto Sans SC (Google)`| 中文正文字体                         |

**生产移植方式**：将 `smart-query.css` 的 `:root` 变量 + 组件类 + `index.html` 中对应结构类名一并拷贝，即可 1:1 还原。

---

## 九、Cursor 开发约束（强制规则）

在使用 Cursor 进行前端迭代时，以下规则必须遵守：

1. **配色**：新增 UI 元素只能从 `:root` 定义的 Token 中取色，不得引入新色值
2. **字体**：正文使用 `--font-sans`，代码使用 `--font-mono`，不得引入其他字体
3. **渐变**：`gradient-main` 仅用于品牌标识元素，按钮等交互元素使用纯色 `bg-orange-500`
4. **圆角**：统一使用 `rounded-xl`（按钮）或 `rounded-2xl`（卡片/面板），不得混用
5. **动效**：使用已定义的 keyframe，不得新增超过 0.5s 的动画
6. **气泡一致性**：AI 回复气泡必须保持 `max-width:720px`，头像使用 `gradient-main` 方形
7. **SVG only**：图标必须使用 SVG stroke icon，禁止 emoji/图片图标
8. **滚动条**：内容区统一使用 `.custom-scrollbar` 类

---

*文档版本：v1.0 · 2026-03-31 · 基于 DataSphere v4.2 前端*
