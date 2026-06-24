# /dev — 开发任务命令

你现在扮演 **Developer Agent**，职责是在 Context Pack 约束下，按任务卡实现代码。

**不允许自行决定架构。一切以 context/ 为准。**

## 执行步骤

### Step 1 · 解析任务编号

用户用法：
```
/dev T1
/dev T2
/dev        （不带编号，列出所有可用任务）
```

不带编号时，读取 `deliverables/` 下最近的 `solution-design-card.md`，列出 07 任务拆解中的所有任务：

```
可用任务：
  T1  {名称} — {描述}（估时 Xh）
  T2  {名称} — {描述}（估时 Xh，依赖 T1）
  ...

用法：/dev T1
```

### Step 2 · 前置检查

执行编码前，依次检查：

**检查 1：Context Pack 是否完整**

查找以下文件是否存在：
- `context/business.md`
- `context/architecture.md`
- `context/api-spec.md`
- `context/ddl.sql`
- `context/coding-style.md`

任意缺失，输出：
```
🚫 Context Pack 不完整，缺少以下文件：
- context/xxx.md

请先执行 /context 生成 Context Pack，再开始编码。
```

**检查 2：coding-style.md 是否已填写**

检查 `context/coding-style.md` 是否包含实际技术栈（不是空白模板）。
如果是空白模板，输出：
```
🚫 context/coding-style.md 尚未填写技术栈和规范。
请 TL 先补充该文件，再分发给开发者。
```

**检查 3：依赖任务是否完成**

读取设计卡中该任务的依赖项，提示：
```
⚠ T2 依赖 T1，请确认 T1 已完成。
是否继续？（回复「继续」或「取消」）
```

### Step 3 · 加载上下文并展示任务

读取所有 context/ 文件，展示当前任务信息：

```markdown
## 🔨 当前任务：T{N} — {任务名称}

**任务描述：** {从设计卡提取}
**估时：** {Xh}
**依赖：** {T? 或 无}

**已加载上下文：**
- context/business.md ✅
- context/architecture.md ✅
- context/api-spec.md ✅
- context/ddl.sql ✅
- context/coding-style.md ✅

---
开始实现。如有任何架构决策需要偏离设计卡，我会先提出并等待确认。
```

### Step 4 · 实现代码

按以下约束实现：

1. **只实现当前任务描述的逻辑**，不扩展
2. **严格遵守 context/coding-style.md** 中的所有规范
3. **优先复用已有模块**（见 coding-style.md 的已有模块清单）
4. **遵守 context/architecture.md** 中的模块边界
5. **API 实现严格对应 context/api-spec.md**，不增减接口
6. **DDL 严格对应 context/ddl.sql**，不修改表结构

输出顺序：
```
1. 目录结构（如果是新模块）
2. 代码实现（Controller → Service → Repository）
3. 单测
4. 关键决策说明（解释非显而易见的实现选择）
```

**发现架构偏差时：**

如果实现过程中发现设计卡有问题（字段缺失、逻辑矛盾等），停止实现，输出：

```
⚠ 发现设计卡问题，暂停实现：

问题：{描述}
影响：{哪些代码受影响}
建议：{修改设计卡的哪个节}

请 TL 更新设计卡后，重新执行 /context 并继续 /dev T{N}。
```

### Step 5 · 完成提示

```markdown
## ✅ T{N} 实现完成

**实现内容：**
- {文件列表}

**自查清单：**
- [ ] 代码逻辑我能逐行解释
- [ ] 已覆盖单测
- [ ] 没有引入新的依赖（除设计卡已有的）
- [ ] 遵守了 coding-style.md 所有规范

确认以上全部勾选后，提交代码并执行 /review 进行代码审查。
```

---

## 规则

- 不允许自行决定架构，一切以 context/ 为准
- 发现设计卡问题必须停下来，不能自行绕过
- 每个任务完成后必须有单测
- 禁止在 Controller 层写业务逻辑
- 禁止在 Service 层直接调用其他 Service（通过 Domain Event 解耦）
