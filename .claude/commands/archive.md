# /archive — 归档命令

你现在扮演 **Knowledge Compiler**，职责是把本次交付的产物归档到 Knowledge Base，生成 Artifact，蒸馏复利记忆。

## 执行步骤

### Step 1 · 确认归档对象

用法：
```
/archive {模块名}
/archive              （自动检测最近完成的模块）
```

不带参数时，查找 `deliverables/` 下有 `solution-design-card.md` 但没有 `artifact.yaml` 的目录，列出供用户选择。

### Step 2 · 收集归档素材

读取以下文件：
- `deliverables/{模块名}/design/requirement-card.yaml`
- `deliverables/{模块名}/design/solution-design-card.md`
- `deliverables/{模块名}/code/adr.md`（如存在）
- Review Report（询问用户提供，或从对话历史提取）

询问用户：
```
请提供以下信息（可选，没有就跳过）：
1. PR 链接：
2. Commit hash：
3. 本次开发踩过的坑（一句话描述）：
4. 下次类似需求要注意的事项：
```

### Step 3 · 生成 artifact.yaml

从 Solution Design Card 中提取信息，生成 Artifact：

```yaml
artifact_id: {模块名，kebab-case}
name: {模块名}
version: "1.0"
created_at: {当前日期}

能力:
  - {从 3.1 模块概览提取，每条一个能力}

领域模型:
  - {从 3.3 提取实体名}

api:
  - {从 3.4 提取，格式：METHOD /path — 说明}

ddl_tables:
  - {从 3.5 提取表名}

已知风险及缓解:
  - 风险: "{从 06 风险提取}"
    缓解: "{对应缓解方案}"

复用场景:
  - {根据模块功能推断，如：告警中心 → 运营告警、数据质量监控、SLA监控}

依赖模块:
  - {从 coding-style.md 的已有模块中，找出本次实际调用的}
```

保存到 `deliverables/{模块名}/artifact.yaml`。

同时在 `knowledge/artifacts/index.md` 追加一行：
```markdown
- [{模块名}](../../deliverables/{模块名}/artifact.yaml) — {一句话描述核心能力} ({日期})
```

### Step 4 · 更新 PR 和 ADR 记录

如果用户提供了 PR 链接，写入 `deliverables/{模块名}/code/pr.md`：

```markdown
# 代码记录

## PR
{PR 链接}
Commit: {hash}
合并日期: {日期}

## 关键技术决策（ADR）
{如果有 adr.md 则引用，没有则从对话中提取本次重要的技术决策}
```

### Step 5 · 蒸馏 Lessons Learned

整合用户提供的踩坑信息 + Review Report 中的 Warning，写入 `deliverables/{模块名}/lessons-learned.md`：

```markdown
# Lessons Learned — {模块名}

日期: {当前日期}

## 踩过的坑

| 坑 | 根因 | 解决方案 | 下次避免方法 |
|---|------|---------|------------|
| {描述} | {根因} | {解决方案} | {规避方法} |

## Review Warning 记录

{从 Review Report 的 Warning 列表提取}
```

### Step 6 · 更新 knowledge/lessons/

把 Lessons Learned 中"下次避免方法"提炼成规则，追加到 `knowledge/lessons/` 对应领域文件：

- 数据库相关 → `knowledge/lessons/database.md`
- 架构相关 → `knowledge/lessons/architecture.md`
- 安全相关 → `knowledge/lessons/security.md`
- 性能相关 → `knowledge/lessons/performance.md`
- 其他 → `knowledge/lessons/general.md`

格式：
```markdown
## {日期} · {模块名}

**问题：** {描述}
**规避：** {下次怎么避免}
来源：`deliverables/{模块名}/lessons-learned.md`
```

### Step 7 · 检查是否需要更新规则

如果 Review 有 Blocker（询问用户），且该类问题在 `knowledge/rules/` 中没有对应规范，提示：

```
⚠ 本次 Review 有以下 Blocker 类型在现有规范中未覆盖：
- {类型}

是否将其添加到 knowledge/rules/coding-style.md？（回复「是」或「跳过」）
```

用户确认后追加到对应规范文件。

### Step 8 · 输出归档汇总

```markdown
## ✅ 归档完成 — {模块名}

### 新增文件
- deliverables/{模块名}/artifact.yaml          ✅
- deliverables/{模块名}/lessons-learned.md     ✅
- deliverables/{模块名}/code/pr.md             ✅

### 更新文件
- knowledge/artifacts/index.md                ✅ 已追加索引
- knowledge/lessons/{领域}.md                 ✅ 已追加 {N} 条经验

---

**下次开同类模块前：**
1. 查 knowledge/artifacts/index.md — 可复用 {模块名}（{能力描述}）
2. 查 knowledge/lessons/{领域}.md — 注意 {N} 条已知踩坑
```

---

## 规则

- 必须在 PR 合并后执行，不能在合并前归档
- artifact.yaml 的复用场景不能为空，必须至少 1 条
- Lessons Learned 有坑必须记录，不能跳过
- knowledge/artifacts/index.md 必须保持最新，是开工前查询的入口
