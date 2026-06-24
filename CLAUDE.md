# AI Dev Copilot — 企业研发团队 AI 协作系统

## 系统定位

本系统是企业研发团队的 **AI Copilot**，核心目标不是让 AI 写代码，而是让需求在进入编码前被结构化、标准化、可审查。

**设计卡是核心产物，代码只是副产品。**

---

## 快速开始（团队成员必读）

### 可用命令

| 命令 | 作用 | 谁用 |
|------|------|------|
| `/req` | 读入需求文档 → 输出 Requirement Card + 缺口清单 | 所有人 |
| `/design` | 读入 Requirement Card → 输出 Solution Design Card | 架构师 / TL |
| `/context` | 从 Approved 设计卡生成 context/ 上下文包 | TL |
| `/dev` | 加载 context/ + 任务卡，驱动编码 | 开发工程师 |
| `/review` | 对当前代码做 4 维度 Review，输出 Report | QA / TL |
| `/archive` | 归档本次交付，生成 Artifact，蒸馏记忆 | 全员 |

### 标准推进顺序

```
/req    → 需求方确认 Requirement Card
/design → TL 确认 Solution Design Card（APPROVED）
/context → 生成 context/ 包
/dev    → 按任务卡编码（T1→T2→T3...）
/review → PR 前审查
/archive → 合并后归档
```

---

## 协作原则

1. **没有 APPROVED 设计卡，禁止任何人进入编码**
2. **编码时必须携带 context/ 包，禁止裸问 AI**
3. **生成代码不能逐行解释，禁止提交**
4. **没有单测，禁止合并**
5. **Review 有 Blocker，禁止合并**
6. **每次合并后必须执行 /archive**

---

## Agent 分工

| Agent | 文件 | 职责 | 禁止 |
|-------|------|------|------|
| Architect Agent | `agents/architect/system_prompt.md` | 输出设计卡 | 写实现代码 |
| Developer Agent | `agents/developer/system_prompt.md` | 按设计卡实现代码 | 自行决定架构 |
| Review Agent | `agents/reviewer/system_prompt.md` | 4 维度代码审查 | 帮忙改代码 |

执行命令前，自动加载对应 Agent 的 system_prompt。

---

## 知识库结构

```
knowledge/
  rules/    — 从 Review Blocker / ADR 固化的规则（每次 /archive 后更新）
  lessons/  — 从 Lessons Learned 蒸馏的经验（每次 /archive 后更新）
  artifacts/ — 模块 Artifact 索引

deliverables/
  {模块名}/
    design/           Requirement Card + Solution Design Card
    code/             PR 链接 + ADR
    lessons-learned.md
    artifact.yaml
```

---

## 开工前必查

每次开始新模块前，先执行：

1. 查 `knowledge/artifacts/` — 有可复用 Artifact？
2. 查 `knowledge/lessons/` — 有相关踩坑？
3. 查 `knowledge/rules/` — 有适用规范？

优先复用，禁止重复实现已有模块。
