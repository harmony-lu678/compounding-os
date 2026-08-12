# Personal Compounding OS — 架构文档 v0.1

- 状态：已评审定稿（2026-08-12），对应 [产品规划 v0.1](./product_plan_v0.1.md)
- 技术决策（用户已拍板）：**web-first、TypeScript 全栈、self-hosted**；后续扩展 iOS 并接入系统/应用生态

---

## 1. 架构总则

1. **API-first**：所有业务能力经 `/api/v1` REST 接口暴露，web 前端是 API 的第一个消费者，iOS 是第二个。禁止把业务逻辑写死在前端组件里。
2. **事件流是唯一事实源**：资产的一切变化（购入、校准、维护、估值、用完、处置）都是 append-only 事件；资产快照和所有指标从事件推导。口径可重算、历史可回溯、未来加指标不迁移数据。
3. **计算引擎是纯函数**：成本/折旧/区间计算全部在无 IO 的 `core` 包内，输入事件流输出带假设清单的区间结果，可单测、可在任何端复用。
4. **区间与假设是一等公民**：引擎所有输出类型强制携带 `Range` 和 `assumptions[]`，类型层面杜绝"裸精确数字"（产品原则 3 的技术落实）。
5. **self-hosted 简单性**：单容器、单 SQLite 文件、备份即拷文件；不引入 MVP 用不上的基础设施。

## 2. 技术选型

| 层 | 选型 | 理由 |
|---|---|---|
| Monorepo | pnpm workspaces | TS 全栈共享类型与校验 schema |
| 前端 + 服务端 | Next.js（App Router） | 一个应用同时承载 UI 与 Route Handler API，self-hosted 部署最简 |
| API 校验/契约 | zod + zod-openapi | schema 单一来源；自动生成 OpenAPI，供未来 Swift 客户端生成代码 |
| 数据库 | SQLite（better-sqlite3）+ Drizzle ORM | 单文件、零运维、事务足够；Drizzle 迁移可版本化 |
| ID | ULID | 时间有序、客户端可生成（为离线/同步预留） |
| 认证 | 单用户：环境变量密码 + httpOnly session cookie | self-hosted 自用，不做用户体系；表结构预留 user_id |
| 测试 | vitest | core 引擎口径回归测试 |
| 部署 | Dockerfile + docker-compose，数据目录挂 volume | 一条命令自托管 |
| UI | Tailwind CSS + shadcn/ui + Recharts | 快速做出干净的 Dashboard |

**不选 tRPC** 的原因：tRPC 契约只对 TS 客户端友好，iOS（Swift）阶段会变成负担；REST + OpenAPI 从第一天保证多端可用。

## 3. 仓库结构

```text
compounding-os/
├── docs/                        # 本文档、产品规划
├── packages/
│   ├── core/                    # 纯 TS 域模型 + 计算引擎（无 IO、无框架依赖）
│   │   ├── src/types.ts         # Asset / Event / Range / Assumption 等
│   │   ├── src/durable.ts       # 耐用品成本引擎
│   │   ├── src/consumable.ts    # 消耗品周期引擎
│   │   ├── src/defaults.ts      # 类目默认值（寿命、残值率、参考频率、消耗周期）
│   │   └── test/                # 口径回归测试 + fixtures
│   └── db/                      # Drizzle schema + migrations + 仓储函数
└── apps/
    └── web/                     # Next.js：页面 + /api/v1 Route Handlers
        ├── app/(ui)/            # Today / Assets / Settings
        ├── app/api/v1/          # REST API
        └── lib/                 # session、API 客户端封装
```

依赖方向：`apps/web → packages/db → packages/core`；`core` 不依赖任何人。

## 4. 数据模型

### 4.1 表结构

**assets** — 资产快照（由事件写穿维护，读路径加速用）

```text
id            TEXT PK (ULID)
user_id       TEXT        -- MVP 恒为 'default'，预留
kind          TEXT        -- 'durable' | 'consumable'
name          TEXT
category      TEXT        -- 类目 key，关联 core/defaults
status        TEXT        -- 'active' | 'disposed' | 'archived'
snapshot      TEXT(JSON)  -- 当前假设与派生要素（见 4.3），从事件重放可完整重建
created_at / updated_at / deleted_at
```

**events** — 唯一事实源（append-only，禁 UPDATE/DELETE）

```text
id            TEXT PK (ULID)
user_id       TEXT
asset_id      TEXT FK
type          TEXT        -- 见 4.2
occurred_at   TEXT        -- 业务时间（如购买日）
payload       TEXT(JSON)  -- 按 type 定义的 zod schema
created_at    TEXT        -- 写入时间
```

**settings** — 键值表：session 盐、周报开关、类目默认值覆盖。

### 4.2 事件类型

| type | payload 要点 | 说明 |
|---|---|---|
| `acquired` | 价格、购买日、（耐用品）寿命/残值区间/频率档位、（消耗品）容量/开始使用日 | 资产诞生 |
| `assumption_changed` | 变更的假设字段 + 新旧值 | 假设面板里的每次修改（=校准） |
| `usage_calibrated` | 「过去一个月用了约 N 次」 | 月度轻校准，收窄频率区间 |
| `usage_logged` | 一次使用（可选功能） | 仅对单独开启的资产 |
| `maintenance_added` | 金额、说明 | 维修/耗材成本 |
| `valued` | 手动估值区间、来源说明 | 如参考闲鱼行情 |
| `depleted` | 用完日期 | 消耗品「用完了」打卡，关闭当前周期 |
| `disposed` | 出售价 / 报废 | 资产终结，实际残值回写口径 |

每种 payload 都有对应 zod schema，`core` 与 API 共用。

### 4.3 快照与重放

- 写路径：API 收到操作 → 校验 → 事务内 `INSERT event` + 用 `core` 重放该资产全部事件重建 `snapshot` → 更新 assets 行。
- 单资产事件量级极小（几十条），全量重放无性能问题，换来口径永远一致。
- 提供管理命令 `rebuild-snapshots`：全库重放，用于引擎口径升级后的重算。

## 5. 计算引擎（packages/core）

### 5.1 核心类型

```typescript
interface Range { min: number; max: number }          // 单位：分

interface Assumption {
  key: string                  // 'freq_tier' | 'lifespan_months' | 'residual' | ...
  label: string                // "使用频率：每周几次（8~16 次/月）"
  value: unknown
  source: 'user' | 'category_default' | 'measured'
  editable: boolean
}

interface MetricResult {
  value: Range
  assumptions: Assumption[]    // 假设面板直接渲染此数组
}
```

引擎没有返回裸 `number` 的公开接口——区间化 + 假设可见由类型系统保证。

### 5.2 耐用品引擎 `computeDurable(events, asOf)`

输出：全周期日均成本、已实现日均成本、估算累计使用次数、单次使用成本、剩余价值（线性折旧至残值区间）、使用率评级。口径公式以产品规划 §4.3 为准，规划文档是口径的单一事实源，引擎实现与测试 fixture 必须与之对齐。

频率区间来源优先级：`usage_calibrated` 实测（±30%）> 自定义频率（±30%）> 档位区间。

### 5.3 消耗品引擎 `computeConsumable(events, asOf)`

- 有 `depleted` 历史：周期取实测分布（min/max），每日成本 = 价格/周期，预计下次用完日期为区间。
- 首瓶未用完：用类目默认周期区间，结果标记 `source: 'category_default'`（前端显示「预估」徽标）。

### 5.4 类目默认值 `defaults.ts`

内置约 20 个类目（电子、家具、鞋服、护肤、食品……）的：默认寿命、残值率区间、参考使用频率（四象限评级基准）、默认消耗周期。用户可在 Settings 覆盖，覆盖存 settings 表。

### 5.5 测试策略

- fixture 场景直接取自产品文档的例子（MacBook 12999/5 年、洗发水 100 元/65 天），作为口径回归基线。
- 每次口径调整 = 修改产品规划 §4 + 同步修改 fixture 期望值，两者不一致视为 bug。

## 6. API 设计（/api/v1）

```text
POST   /api/v1/auth/login                  # 密码 → session cookie
GET    /api/v1/assets?kind=&sort=          # 列表（含指标摘要）
POST   /api/v1/assets                      # 录入（内部生成 acquired 事件）
GET    /api/v1/assets/:id                  # 详情：全指标 + 假设 + 事件时间线
POST   /api/v1/assets/:id/events           # 追加事件（校准/维护/估值/用完/处置）
GET    /api/v1/dashboard                   # Today 页聚合：总值、今日成本、四象限
GET    /api/v1/digest/weekly               # 周报数据
GET    /api/v1/export?format=json|csv      # 全量导出
GET    /api/v1/openapi.json                # 由 zod 生成的 OpenAPI 文档
```

约定：

- 所有金额字段为整数分；所有推算值为 `{ value: {min,max}, assumptions: [...] }` 结构。
- 修改假设没有独立端点——就是向 `/assets/:id/events` 追加 `assumption_changed`，保证"修改即校准、可回溯"。
- 错误响应统一 `{ error: { code, message } }`。

## 7. 部署、隐私与备份

- `docker compose up -d`：单容器跑 Next.js standalone，`./data` 挂载卷内含 `app.db`。
- 认证：`APP_PASSWORD` 环境变量；session 为 httpOnly + SameSite cookie。公网暴露时建议置于反代 + HTTPS 之后（文档写入 README，不代管）。
- 备份：停写拷贝 `app.db` 即可；提供 `GET /export` 作为逻辑备份。
- **隐私底线**：数据永远只在用户自己的机器上；Phase 2 的 AI 洞察为显式开关，Provider 抽象接口支持 Ollama（本地）与远端 API 两种实现，默认本地；发送给远端模型前对资产名称做可配置脱敏。

## 8. iOS 与生态联动落地方案（Phase 4，本期只保证不封路）

### 8.1 本期（Phase 1）必须预埋的四件事

1. **REST + OpenAPI**（§2/§6）：Swift 客户端用 openapi-generator 直接生成，零手写协议层。
2. **ULID + 事件 append-only + 软删除**：同步协议的基础。事件天然免冲突（只追加），同步 = 交换事件日志。
3. **业务逻辑全部在 API 之后**：iOS 不需要复刻任何计算——指标由服务端算好（含区间与假设）下发；离线场景下 Swift 端只需实现极小的"待同步事件暂存"。
4. **深链协议预留**：事件创建 API 支持幂等键（客户端生成 ULID），NFC/快捷指令重复触发不产生重复事件。

### 8.2 iOS 阶段的同步协议（设计已定，届时实现）

```text
PULL  GET  /api/v1/sync/events?since=<cursor>     # 拉取增量事件
PUSH  POST /api/v1/sync/events                    # 批量提交本地暂存事件（幂等）
```

事件 append-only 使同步无需 CRDT/OT；快照由各端从事件重算或直接向服务端要。

### 8.3 生态联动清单（对应产品规划 Phase 4）

| 能力 | 技术载体 | 落到本架构的方式 |
|---|---|---|
| Siri / 快捷指令打卡 | App Intents | Intent → `POST /assets/:id/events`（usage_logged） |
| NFC 标签碰一下记录 | Core NFC + URL Scheme `compos://log?asset=<ulid>` | 深链 → 同上，幂等键防重 |
| 桌面小组件 | WidgetKit | 读 `GET /dashboard` 缓存 |
| 屏幕时间自动采集 | DeviceActivity / Screen Time API | 定期汇总为 usage_calibrated 事件（数字资产） |
| 小票/截图导入 | VisionKit OCR | 解析为 acquired 草稿，用户确认后落事件 |
| 健康数据（远景） | HealthKit | Phase 5 健康资产的数据源 |

## 9. 里程碑拆解（Phase 1 开发顺序）

```text
M1  monorepo 骨架 + core 类型与耐用品引擎 + 口径回归测试
M2  消耗品引擎 + 类目默认值
M3  db schema + 事件写入/快照重放 + API（assets/events/dashboard）
M4  web UI：录入、列表、详情 + 假设面板
M5  Dashboard 四象限 + 周报 + 导出
M6  认证 + Docker 部署 + README（self-hosted 指南）
```

M1/M2 先行且纯函数可独测——口径正确是这个产品的命，UI 都在其后。

## 10. 未决事项（不阻塞 Phase 1 开工）

- 周报邮件通道选型（self-hosted SMTP 配置即可，MVP 先做站内周报页）。
- Phase 2 金融资产快照的表设计（大概率复用 events：`balance_snapshot` 事件）。
- Phase 3 决策对比引擎的机会成本收益率默认区间（届时定，假设面板机制已覆盖）。
