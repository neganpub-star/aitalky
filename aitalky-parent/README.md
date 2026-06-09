# aitalky-server 后端工程

> 模块化单体（DDD 模块，不上微服务）+ 多部署单元。技术栈：Java 21 + Spring Boot 3 + Maven + MyBatis-Plus；MySQL + MongoDB + Redis + RocketMQ + MinIO；Netty WS。
> 设计文档见 monorepo 根 `doc/design/`。

## 目录（monorepo 布局）

```
aitalky/                      # monorepo 根
├── doc/                      # 设计文档
├── aitalky-server/           # 后端（本工程，Maven 多模块）
└── web/                      # 前端（pnpm monorepo，后续）
```

## 模块结构

> 按职责分 3 个聚合组（各带聚合 pom），避免 13 个模块平铺：

```
aitalky-server/  (parent pom = aitalky-parent)
│
├── aitalky-base/          基础设施组（被所有业务模块依赖）
│   ├── aitalky-common         通用：统一响应 R / 错误码 / 业务异常 / 雪花ID
│   └── aitalky-framework      基建：多租户(Web拦截器+MyBatis SQL层) / JWT / i18n / Redisson / 分布式锁 / 审计填充
│
├── aitalky-modules/       业务模块组（纯库，被入口装配；只暴露 api 包，不互碰 Mapper）
│   ├── aitalky-platform       pf_  平台后管
│   ├── aitalky-identity       id_  账号/项目/角色/成员/邀请 + RBAC/多租户
│   ├── aitalky-messenger      mse_ 信使/多语言内容/API管理
│   ├── aitalky-routing        asn_ 会话设置/客服组/分配引擎
│   ├── aitalky-customer       cus_ 客户身份/聚合/画像
│   ├── aitalky-conversation   cnv_ 会话生命周期/收件箱/转派/保持期
│   ├── aitalky-message        消息(Mongo)/翻译/已读/撤回/序号+可靠投递
│   └── aitalky-billing        pay_ 订阅/配额/加密支付(NexaPay)/订单
│
└── aitalky-launcher/      启动入口组（装配业务模块 → 可执行 jar）
    ├── aitalky-app            ★ 业务 API（无状态，横向扩展 N 实例）   端口 8080
    ├── aitalky-admin          平台后管 API（独立部署=安全隔离）        端口 8090
    └── aitalky-ws             实时网关（Netty WS，横扩+Redis路由）     端口 9000
```

依赖方向：`launcher → modules → framework → common`。聚合组本身只是 packaging=pom 的聚合器，各叶子模块仍统一继承 `aitalky-parent`。

## 横向扩展要点（已在骨架体现）

- **无状态**：JWT 鉴权，状态全放 Redis（`aitalky-framework` 的 TenantContext / Redisson）。
- **雪花ID**：每实例不同 `aitalky.id.datacenter-id` / `worker-id`，否则多实例 ID 冲突。
- **分布式锁**：`DistributedLockTemplate`（会话分配/幂等）。
- **分布式定时**：`CloseIdleConversationJob` 用锁保证多实例只跑一次。
- **WS 多端推送**：`ConnectionRegistry`（一身份多连接、在线=引用计数、不单点顶号）+ `PushService`
  （推送 = assignee 全部连接 ∪ 会话订阅者 → 多端/代看/代发都收到）。
- **后端 i18n**：`MessageUtil` 按调用方语言返回 API 提示。

## 本地运行

依赖中间件（自备）：MySQL 8、Redis、MongoDB、RocketMQ。**本地开发阶段连接信息/密钥直接写在各 `application.yml`（明文，指向 localhost）**，无需环境变量。

```bash
cd aitalky-parent

# 1) 初始化数据库（utf8mb4 / utf8mb4_general_ci，详见 sql/README.md）
mysql -uroot -p < sql/01-schema.sql          # 建库 aitalky + 26 表
mysql -uroot -p aitalky < sql/02-seed.sql    # 平台级种子数据

# 2) 编译打包（无需中间件）
mvn -q clean package -DskipTests

# 3) 跑业务 API（需 MySQL/Redis/Mongo/RocketMQ 已启动）
java -jar aitalky-launcher/aitalky-app/target/aitalky-app.jar

# 健康检查（演示统一响应 + 多语言提示）
curl -H "lang: en_US" http://localhost:8080/api/ping
curl -H "lang: zh_CN" http://localhost:8080/api/ping
```

> ⚠ 当前 `application.yml` 为**本地开发明文配置**（含数据库密码、JWT 密钥）。**上线前必须**改为环境变量/配置中心注入密钥，并为每实例配置唯一的雪花 ID `datacenter-id/worker-id`（app/admin/ws）与 `instance-id`（ws）。

## identity 接口（已落地）

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/auth/register` | 注册(邮箱+密码) |
| POST | `/api/auth/login` | 登录 → 账号级 token + 可进入项目列表 |
| POST | `/api/projects` | 创建项目(自动建 3 系统角色 + owner 成员)，需账号级 token |
| POST | `/api/auth/enter/{projectId}` | 进入项目 → 项目级 token(含 projectId/memberId/functions) |
| GET  | `/api/whoami` | 回显当前租户上下文(验证 JWT + 多租户隔离) |
