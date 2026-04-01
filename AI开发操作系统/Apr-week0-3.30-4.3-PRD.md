# DataSphere 智能问数 · Apr Week0 (3.30 ~ 4.3) 迭代 PRD

| 项目 | 说明 |
|------|------|
| 文档类型 | 功能迭代 PRD |
| 适用产品 | DataSphere NL2SQL 智能问数系统 |
| 版本分支 | `Apr-week0-3.30-4.3` |
| 修订日期 | 2026-04-01 |

---

## 1. 埋点需求匹配门控

### 1.1 背景

用户查询涉及产品功能时（如"灵感续写功能的创作人数"），系统无法确定对应的前端埋点字段 `entity_name` / `entity_type` 取值。此前直接幻觉捏造枚举值（如 `sub_type = 'TaskSubTypeVideoInspireContinue'`），SQL 执行失败

### 1.2 方案

从埋点需求 xlsx 构建索引 → 用户查询模糊匹配 → 前端候选确认 → 确认结果注入 SQL 生成上下文。

```
用户查询 → 语义理解(Step1) → 知识检索(Step2) → [埋点匹配门控(Step2.5)] → SQL生成(Step3)
                                                 │
                                                 ├─ 匹配到候选 → 返回 need_event_confirm（候选列表 + 截图）
                                                 │                ↓ 用户选择
                                                 │              携带 event_confirmed 重新发起 → 进入 SQL 生成
                                                 │
                                                 └─ 无候选 → 直通 SQL 生成
```

**关键约束**：只阻断 SQL 生成步骤，不阻断语义理解和知识检索（前置步骤已完成的结果直接复用）。

### 1.3 数据源

从数分维护的【海艺】埋点需求汇总表（数分管理） xlsx 中提取：

| 字段 | 来源 |
|------|------|
| 埋点描述（desc / detail） | xlsx「埋点」+「带参」列 |
| entity_name / entity_type / front_operation | xlsx「埋点方案（自定义属性）」列 |
| 截图 | xlsx 内嵌图片，提取为 PNG |

构建为每条记录包含 `id`、`desc`、`detail`、`entity_name[]`、`entity_type[]`、`front_operation[]`、`screenshot`、`search_text`。

### 1.4 匹配逻辑

| 步骤 | 说明 |
|------|------|
| 分词 | 中文按标点/空格切块 + 2-4 字符滑动窗口（n-gram） |
| 评分 | 全文子串命中、token 命中、描述关键词权重综合打分 |
| 过滤 | `min_score ≥ 30`（低于此阈值视为无关，直通 SQL 生成） |
| 输出 | `top_k = 5` 候选，含 `desc`、`detail`、`entity_name[]`、`entity_type[]`、`screenshot_url` |

### 1.5 后端变更

| 变更 |
|------|
| 新建模块：索引加载、中文分词、模糊匹配、候选输出 |
| 新建索引文件 |
 | 新建截图目录（16 张 PNG） |
 | 新增 `event_screenshots/` 静态路由；新增 `event-tracker/match`（调试）、`event-tracker/reload`（热重载） |
 | 新增 Step 2.5 门控：有 `event_confirmed` 时注入上下文；否则执行匹配，有候选返回 `need_event_confirm` 暂停 |

---

## 2. 前端交互升级

### 2.1 埋点候选多选确认

| 功能 | 说明 |
|------|------|
| 多选 toggle | 点击候选卡片 toggle 选中/取消，橙色边框 + 勾号标识选中态 |
| 确认按钮 | 选中 ≥ 1 项后底部出现「确认选择（N）」渐变按钮；合并所有选中候选的 `entity_name` / `entity_type` / `front_operation` 去重后提交 |
| ? 热区截图 | 每个候选右侧 `?` 圆形图标（默认指针，不改变鼠标形态）；hover 时右侧弹出 300px 悬浮窗展示截图，`pointer-events: none` 不阻挡卡片点击 |
| 反馈兜底 | 底部置底虚线边框选项 🤷「emmm 都不太对，帮我反馈一下」，触发跳过匹配直接查询 |

### 2.2 对话一致性

| 项 | 规范 |
|----|------|
| 气泡宽度 | 事件确认气泡 `max-width: 720px`，所有 AI 回复对齐 |
| 头像 | 橙色渐变（`gradient-main`），全局 AI 头像一致 |
| 引导文案 | 口语化：「嘿，这个功能对应好几个埋点事件，可以多选哦～点击选中，hover 右边的 ? 看截图确认」 |

---

## 3. app_id 完整映射

### 3.1 背景

旧映射仅 9 项，采用 `LIKE '%seaart'` 通配符，存在误匹配和遗漏

### 3.2 变更

升级为 30+ 项精确匹配，覆盖全端全产品线。

| 变更点 | 旧 | 新 |
|--------|-----|-----|
| App端 | `LIKE 'app%seaart'` | `= 'app_global_seaart'` |
| 三端 | `LIKE '%seaart' AND != 'seaart'` | `IN ('app_global_seaart','web_global_seaart','phone_global_seaart')` |
| 未指定端 | 无默认值 | 默认 `web_global_seaart` |

### 3.3 产品线覆盖

| app_id | 别名 | 运营状态 |
|--------|------|----------|
| `app_global_seaart` | 商店包 / App端 | 持续运营中 |
| `web_global_seaart` | Web 端 / PC端 | 运营中 |
| `phone_global_seaart` | H5 / 手机端 | 运营中 |
| `mini_global_seaart` | 小程序 | 运营中 |
| `app_official_seaart` | 官网包 | 持续运维中 |
| `ai.seaart.thai` | 泰国版（官网包） | 运维中 |
| `app_huawei_seaart` | 华为包 | 运营中（支付问题暂未更新版本） |
| `app_samsung_seaart` | 三星包 | 应用市场开户未过，暂未更新，保留 |
| `app_china_seaart` | 国服 / 中国版 | 运营中 |
| `openapi_global_seaart` | OpenAPI | 运营中 |
| `web_global_checkout` | 收银台 | 运营中 |
| `ai.seaart.seasoul` | seasoul | 运营中 |
| `@seacloud/web` | seacloud | 运营中 |
| `custom_mall_biz` | 3D电商 | 运营中 |
| `ai.seaart.seabellnovel` | seabell | 运营中 |
| `live.moreshort.app` | MoreShort / 短剧 | 运营中 |
| `live.moreshort.app.jp` | 短剧日本版 | 运营中 |
| `ai.seaart.video` | seabuzz | 运营中 |
| `gen.seagen.app` | SeaGen App | 运营中 |
| `seagen` | seagen WEB/H5 | 运营中 |
| `app_global_seeu` | SeeU | 运营中 |
| `app_global_wave` | Wave | 运营中 |
| `agentos` / `agentos_web` / `agentos_app` / `agentos_h5` | AgentOS 系列 | 运营中 |

System prompt 规则 4（v3 + v4）同步更新。

---

## 4. 附件上传

### 4.1 功能说明

用户可通过 **拖拽** 或 **点击上传按钮** 将 CSV / Excel (.xlsx/.xls) / TSV 文件上传，结合自然语言查询，系统对上传文件进行解析后联合 NL2SQL 生成查询。

### 4.2 交互流程

```
用户拖拽/点击上传文件 → 输入框上方显示文件标签（文件名 + 大小）
                      → 用户输入自然语言问题（如"这些用户的 7 日留存率"）
                      → 点击发送
```

前端状态管理：

| 状态 | 说明 |
|------|------|
| `PQ.uploadedFile` | 存储用户选择的 File 对象 |
| `PQ.activeMode = 'upload'` | 激活上传模式，发送时走 upload 分支 |
| 文件标签 | 蓝色 pill 样式，显示文件名 + 大小(KB)，可点 × 清除 |

### 4.3 后端处理

端点：`POST /api/upload-query-stream`（SSE 流式）

| Step | 说明 |
|------|------|
| 1. 文件解析 | 使用 pandas 解析上传文件，输出列名、行数、数据类型、ID 候选列 |
| 2. 语义理解 | Claude 分析用户查询意图 |
| 3. 知识库检索 | 检索相关表信息，获取 schema grounding |
| 4. SQL 生成 | 将文件 schema（列名+类型+样本）作为上下文注入 Claude，生成查询 SQL |
| 5. 执行 | 在 StarRocks 执行生成的 SQL |

支持格式：

| 格式 | MIME / 扩展 |
|------|-------------|
| CSV | `.csv` |
| Excel | `.xlsx`, `.xls` |
| TSV | `.tsv` |

### 4.4 拖拽交互与容错恢复

| 交互场景 | 预期行为 |
|----------|----------|
| 文件拖入输入区域 | 显示蓝色虚线引导浮层 + 「松手上传文件」提示 |
| 在输入区域内松手 | 完成上传，浮层消失，输入框顶部显示文件标签 |
| 非支持格式文件 | 弹出提示「仅支持 CSV、Excel、TSV 文件」 |
| 在输入区域外松手 | 浮层消失，恢复输入框原样式 |
| 文件拖出浏览器窗口后松手 | 浮层消失，恢复输入框原样式 |
| 拖拽过程中取消操作 | 浮层消失，恢复输入框原样式 |

---

## 版本信息

| 项 | 值 |
|----|-----|
| 分支 | `Apr-week0-3.30-4.3` |
| 基础分支 | `feature/nl2sql-v3-risk-hardening` |
| 提交 | `3045674` |
| 远端 | `origin/Apr-week0-3.30-4.3` ✅ |
