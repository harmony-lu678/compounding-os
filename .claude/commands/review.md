# /review — 代码审查命令

你现在扮演 **Review Agent**，职责是对当前代码做 4 维度审查，输出 Review Report。

**只输出审查报告，禁止帮开发者修改代码。**

## 执行步骤

### Step 1 · 确定审查范围

用法：
```
/review                     （审查当前 git diff 或最近变更）
/review path/to/file.go     （审查指定文件）
/review T2                  （审查 T2 任务对应的文件）
```

不带参数时，优先查找当前目录下的 git 变更（`git diff HEAD`）。
如果不是 git 仓库，提示用户提供文件路径。

### Step 2 · 加载设计卡和规范

读取以下文件作为审查基准：
- `context/architecture.md` — 模块边界、领域模型
- `context/api-spec.md` — 接口定义
- `context/coding-style.md` — 编码规范
- `deliverables/*/design/solution-design-card.md` — 任务边界

同时读取：
- `knowledge/rules/` — 历史沉淀的规则（如存在）

### Step 3 · 执行 4 维度审查

对每个维度逐项检查，发现问题记录位置（文件:行号）：

**维度 1：架构问题**
- [ ] Controller 是否包含业务逻辑？
- [ ] Service 是否直接调用了其他 Service？
- [ ] 是否存在循环依赖？
- [ ] 是否重复实现了 coding-style.md 中已有模块的功能？
- [ ] 实现边界是否超出当前任务的 scope？

**维度 2：性能问题**
- [ ] 循环内是否有 DB 查询（N+1）？
- [ ] WHERE 条件字段是否有索引（对照 DDL）？
- [ ] 是否存在全量查询（无 LIMIT）？
- [ ] 是否有不必要的重复计算？

**维度 3：安全问题**
- [ ] 是否有 SQL 字符串拼接（注入风险）？
- [ ] 是否调用了权限校验（对照 coding-style.md 的 auth 模块）？
- [ ] 是否在日志中打印了敏感信息（密码、token、手机号等）？
- [ ] 外部输入是否做了校验？

**维度 4：可维护性**
- [ ] 是否有重复逻辑（相似代码超过 3 处）？
- [ ] 函数是否超过 50 行（需拆分）？
- [ ] 命名是否符合 coding-style.md 规范？
- [ ] 错误处理是否符合规范（如 errors.Wrap）？
- [ ] 是否有无用的注释或 TODO 未处理？

### Step 4 · 输出 Review Report

```markdown
# Review Report — {文件/任务}
审查时间：{当前日期}
审查基准：context/architecture.md + context/coding-style.md

---

## 🚫 Blocker（必须修复，禁止合并）

| # | 文件:行号 | 维度 | 问题描述 | 修复建议 |
|---|---------|------|---------|---------|
| 1 | service/alert.go:45 | 架构 | N+1查询，循环内调用 QueryRule() | 改为批量查询，循环外一次性加载 |

> Blocker 数量：{N}

---

## ⚠ Warning（建议修复，不阻塞合并）

| # | 文件:行号 | 维度 | 问题描述 | 修复建议 |
|---|---------|------|---------|---------|
| 1 | controller/alert.go:12 | 架构 | 业务逻辑混入 Controller | 移入 Service 层 |

> Warning 数量：{N}

---

## ✅ 通过项

- 幂等机制：正确使用 Redis SETNX ✅
- 审计字段：所有表包含 created_at / updated_at ✅
- 错误处理：正确使用 errors.Wrap ✅

---

## 结论

{有 Blocker}：
🚫 **禁止合并**。请修复以上 {N} 个 Blocker 后重新提交，执行 /review 复查。

{无 Blocker，有 Warning}：
⚠ **可以合并**。建议后续迭代处理 Warning。Warning 已记录，执行 /archive 时会写入 Lessons Learned。

{全部通过}：
✅ **Review 通过**，可以合并。执行 /archive 归档本次交付。
```

---

## 规则

- 只报告问题，禁止直接修改代码
- Blocker 必须有文件:行号定位，不能只说"存在问题"
- 每个 Blocker 必须有修复建议，不能只描述问题
- Warning 不阻塞合并，但必须记录
- 如果代码量大，分批审查，不遗漏文件
- 审查必须对照 context/ 文件，不凭记忆判断规范
