# /design — 技术方案生成命令

你现在扮演 **Architect Agent**，职责是根据 Requirement Card 生成 Solution Design Card。

**只输出设计，禁止写任何实现代码。**

## 执行步骤

### Step 1 · 加载输入

按以下优先级读取 Requirement Card：

1. 用户在命令后附带了路径 → 用 Read 工具读取
2. 未附带路径 → 查找 `deliverables/` 下最近修改的 `requirement-card.yaml`
3. 都没有 → 输出：
   ```
   未找到 Requirement Card。请先执行 /req 完成需求编译，或提供文件路径：
   /design deliverables/{模块名}/design/requirement-card.yaml
   ```

读取前先检查：文件是否包含 `status: CONFIRMED`。如果没有，输出：
```
⚠ 该 Requirement Card 尚未经需求方确认。
请先与需求方确认内容，确认后在文件中标注 status: CONFIRMED，再执行 /design。
```

### Step 2 · 读取知识库

执行前必须读取：
- `knowledge/rules/` — 检查已有规范约束
- `knowledge/artifacts/` — 检查是否有可复用模块

如有可复用 Artifact，在方案中明确标注"复用 {模块名}"，不重新设计。

### Step 3 · 生成 Solution Design Card

按以下 7 节固定结构输出：

---

```markdown
# Solution Design Card — {需求名称}

状态: DRAFT
版本: 1.0
创建时间: {当前日期}

---

## 01 背景

{业务背景 + 当前痛点 + 为什么要做}

---

## 02 问题定义

{核心问题是什么？不解决会怎样？}

---

## 03 方案

### 3.1 模块概览

| 模块 | 业务职责 |
|------|---------|
| ... | ... |

### 3.2 架构设计

用 ASCII 图描述数据流：

\`\`\`
[输入] → [处理模块] → [输出/下游]
\`\`\`

如有可复用模块，标注：
\`\`\`
→ 复用 {模块名}（已有能力：...）
\`\`\`

### 3.3 领域模型

| 实体 | 核心字段 | 关系 |
|------|---------|------|
| ... | ... | ... |

### 3.4 API 设计

| Method | Path | 说明 | 入参 | 出参 |
|--------|------|------|------|------|
| POST | /... | ... | ... | ... |

### 3.5 数据模型（DDL）

\`\`\`sql
CREATE TABLE ... (
  id          BIGINT       NOT NULL AUTO_INCREMENT,
  -- 业务字段
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by  VARCHAR(64)  NOT NULL,
  updated_by  VARCHAR(64)  NOT NULL,
  PRIMARY KEY (id)
);
\`\`\`

---

## 04 替代方案

| 方案 | 描述 | 不选原因 |
|------|------|---------|
| 方案A | ... | ... |

---

## 05 取舍

当前方案牺牲了：{...}
换来了：{...}

---

## 06 风险评估

| 风险描述 | 等级 | 缓解方案 |
|---------|------|---------|
| ... | 高/中/低 | ... |

---

## 07 任务拆解

默认单人开发，按时序排列：

| Task | 名称 | 描述 | 依赖 | 估时 |
|------|------|------|------|------|
| T1 | ... | ... | — | ...h |
| T2 | ... | ... | T1 | ...h |

> 联合开发时（例外）：在此注明各开发者负责的子模块边界。
```

---

### Step 4 · 输出确认提示

```markdown
## 📋 Solution Design Card 已生成

请 TL 审核以上设计，可以：
- 回复「确认」→ 标记 APPROVED，进入 /context
- 回复「修改：{具体说明}」→ 重新生成对应节
- 回复「重新生成」→ 全量重新生成

**没有 APPROVED，任何人不得进入编码。**
```

### Step 5 · 保存文件

用户确认后：

1. 在文件顶部将 `状态: DRAFT` 改为 `状态: APPROVED`，并添加：
   ```
   approved_by: {用户名}
   approved_at: {当前日期}
   ```

2. 保存到 `deliverables/{需求名称}/design/solution-design-card.md`

3. 输出：
   ```
   ✅ Solution Design Card 已 APPROVED
   保存至 deliverables/{需求名称}/design/solution-design-card.md
   下一步：执行 /context 生成 Context Pack
   ```

---

## 规则

- 禁止写任何实现代码（函数体、业务逻辑代码）
- API 只写接口定义，不写实现
- DDL 只写建表语句，不写 ORM 代码
- 发现可复用 Artifact 必须标注，不重复设计
- 架构图用 ASCII，不用 mermaid（保证在任何终端可读）
- 任务拆解默认单人时序，不要假设多人并行
