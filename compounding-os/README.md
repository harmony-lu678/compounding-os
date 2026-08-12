# Personal Compounding OS

> 记录你拥有的，计算你消耗的，衡量你积累的，预测你未来的。

个人长期主义操作系统。MVP 切入点：**「我的东西到底值不值？」**——计算每一件耐用品与消耗品的真实持有成本（日均成本、单次使用成本），把"贵不贵"变成"划不划算"。

self-hosted、数据完全归自己、web-first（后续扩展 iOS 与系统生态联动）。

## 文档

| 文档 | 内容 |
|---|---|
| [产品规划 v0.1](docs/product_plan_v0.1.md) | 定位、产品原则、指标口径、MVP 范围、五期路线图 |
| [架构文档 v0.1](docs/architecture_v0.1.md) | 技术选型、事件流数据模型、计算引擎、API、iOS 落地方案 |

## 产品原则（不随迭代妥协）

1. 估算优先于记录——频率档位 + 偶尔校准，不强制逐次打卡
2. 消耗品只记「用完了」，不记剩余量
3. 所有推算区间化 + 假设可见可修改
4. 算清楚账，不替用户裁决（无 Buy / Don't Buy）
5. 数据开放，事件级导出，无 lock-in

## 技术栈

TypeScript 全栈：Next.js（App Router）· SQLite + Drizzle · zod + OpenAPI · pnpm monorepo · Docker self-hosted

## 状态

规划与架构已定稿（2026-08-12），代码开发未开始。开发顺序见架构文档 §9 里程碑。
