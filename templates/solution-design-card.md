# Solution Design Card — {需求名称}

状态: DRAFT
版本: 1.0
创建时间: {YYYY-MM-DD}
approved_by: ""
approved_at: ""

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

```
[输入] → [处理模块] → [输出/下游]
```

> 如复用已有模块，标注：→ 复用 {模块名}（已有能力：...）

### 3.3 领域模型

| 实体 | 核心字段 | 关系 |
|------|---------|------|
| ... | ... | ... |

### 3.4 API 设计

| Method | Path | 说明 | 入参 | 出参 |
|--------|------|------|------|------|
| POST | /... | ... | ... | ... |

### 3.5 数据模型（DDL）

```sql
CREATE TABLE table_name (
  id          BIGINT       NOT NULL AUTO_INCREMENT,
  -- 业务字段

  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by  VARCHAR(64)  NOT NULL,
  updated_by  VARCHAR(64)  NOT NULL,
  PRIMARY KEY (id)
);
```

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

> 默认单人开发，按时序排列。联合开发（例外）时注明子模块边界。

| Task | 名称 | 描述 | 依赖 | 估时 |
|------|------|------|------|------|
| T1 | ... | ... | — | ...h |
| T2 | ... | ... | T1 | ...h |
