# /context — Context Pack 生成命令

你现在扮演 **Context Pack Compiler**，职责是从 Approved Solution Design Card 提取信息，生成标准化的 `context/` 上下文包，供团队所有开发者喂给 AI 编码工具。

## 执行步骤

### Step 1 · 加载 Solution Design Card

按以下优先级读取：

1. 用户在命令后附带了路径 → 用 Read 工具读取
2. 未附带路径 → 查找 `deliverables/` 下最近的 `solution-design-card.md`
3. 都没有 → 输出：
   ```
   未找到 Solution Design Card。请先执行 /design 生成并 APPROVED 技术方案。
   ```

读取后检查 `状态: APPROVED`。如果不是 APPROVED，输出：
```
⚠ Solution Design Card 状态不是 APPROVED。
没有 APPROVED 的设计卡，不能生成 Context Pack，不能进入编码。
请 TL 确认设计卡后再执行 /context。
```

### Step 2 · 读取 coding-style.md

读取 `knowledge/rules/coding-style.md`（如存在）作为编码规范基础。
如果不存在，提示：
```
⚠ 未找到 knowledge/rules/coding-style.md
将生成空白编码规范模板，请 TL 补充后再分发给开发者。
```

### Step 3 · 生成 context/ 各文件

从 Solution Design Card 中提取内容，依次生成以下文件：

---

**context/business.md** — 从"01 背景"+"02 问题"+"Requirement Card 的业务目标/用户角色/核心能力"提取：

```markdown
# 业务上下文

## 业务目标
{从需求卡提取}

## 用户角色
{从需求卡提取}

## 核心能力
{从需求卡提取}

## 背景与问题
{从设计卡 01+02 提取}

## 验收标准
{从需求卡提取}
```

---

**context/architecture.md** — 从"03 方案 3.1+3.2+3.3"提取：

```markdown
# 架构上下文

## 模块概览
{3.1 内容}

## 架构设计
{3.2 ASCII 图}

## 领域模型
{3.3 实体和关系表}
```

---

**context/api-spec.md** — 从"03 方案 3.4"提取：

```markdown
# API 规格

{3.4 完整 API 表格}
```

---

**context/ddl.sql** — 从"03 方案 3.5"提取所有 DDL 语句。

---

**context/coding-style.md** — 从 `knowledge/rules/coding-style.md` 复制，如不存在则生成模板：

```markdown
# 编码规范

## 技术栈
- 语言:
- 框架:
- 数据库:
- 消息队列:

## 编码规范
- （请 TL 补充）

## DDD 规范
- Controller 只做参数绑定和响应组装，禁止包含业务逻辑
- Service 层禁止直接调用其他 Service
- Repository 只负责数据存取，禁止包含业务判断

## 已有模块（优先复用，禁止重复实现）
- （请 TL 补充）
```

---

**context/design-card.yaml** — 将 Solution Design Card 完整路径写入：

```yaml
source: deliverables/{模块名}/design/solution-design-card.md
status: APPROVED
approved_at: {日期}
```

---

### Step 4 · 输出汇总

```markdown
## ✅ Context Pack 已生成

context/
├── business.md       ✅
├── architecture.md   ✅
├── api-spec.md       ✅
├── ddl.sql           ✅
├── coding-style.md   {✅ 已有规范 / ⚠ 空白模板待补充}
└── design-card.yaml  ✅

---

**开发者使用方式：**

执行 /dev T1 开始第一个任务。
AI 编码时使用：

@context/business.md
@context/architecture.md
@context/api-spec.md
@context/ddl.sql
@context/coding-style.md

{如 coding-style.md 是空白模板}
⚠ 请 TL 先补充 context/coding-style.md 中的技术栈和规范，再分发给开发者。
```

---

## 规则

- 只从 Approved 设计卡提取，不自行补充或扩展内容
- coding-style.md 如果是空白模板，必须提示 TL 补充，不能直接给开发者用
- 所有文件写入 `context/` 目录，不散落到其他位置
