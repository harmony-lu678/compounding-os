# 编码规范

> 复制到 context/coding-style.md 后，由 TL 填写团队实际情况。

## 技术栈

- 语言:
- 框架:
- 数据库:
- 消息队列:
- 缓存:
- 其他:

## 编码规范

- （示例）禁止物理删除，使用 deleted_at 软删除
- （示例）所有表必须包含 created_at / updated_at / created_by / updated_by
- （示例）分页查询必须使用 LIMIT + OFFSET，禁止全量查询
- （示例）错误必须使用 errors.Wrap 包装，不允许直接 return err

## DDD 规范

- Controller 只做参数绑定和响应组装，禁止包含业务逻辑
- Service 层禁止直接调用其他 Service，通过 Domain Event 解耦
- Repository 只负责数据存取，禁止包含业务判断

## 安全规范

- 禁止 SQL 字符串拼接，必须使用参数化查询
- 所有接口必须调用权限校验模块
- 禁止在日志中打印密码、token、手机号等敏感信息
- 外部输入必须在 Controller 层做参数校验

## 已有模块（优先复用，禁止重复实现）

| 模块名 | 能力 | 调用方式 |
|--------|------|---------|
| （示例）message-center | 邮件/钉钉/企微消息发送 | RPC / SDK |
| （示例）user-center | 用户信息查询 | RPC |
| （示例）auth-center | 权限校验 | 中间件 |
