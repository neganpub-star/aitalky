# aitalky-web 前端（monorepo）

三个前端**同在一个仓库**(pnpm monorepo),代码共享、产物各自独立部署:

| 端 | 包名 | 目录 | dev 端口 | 说明 |
|---|---|---|---|---|
| 坐席工作台 | `@aitalky/console` | `apps/console` | **5173** | 客服坐席台(React+TS+Vite+AntD) |
| 信使端 H5 | `@aitalky/messenger` | `apps/messenger` | **5174** | 终端客户聊天窗,URL 接入(轻量,无 AntD) |
| 平台后管 | `@aitalky/admin` | `apps/admin` | 5175(规划) | 平台管理后台(尚未创建) |

> 三端同仓 = 共享依赖/工具链/类型,可抽 `packages/*` 复用;但各自 `vite build` 产出独立静态包,运行时互不影响。

---

## 一、前置条件

1. **Node ≥ 18**、**pnpm ≥ 9**(本机用 pnpm 10)。没装 pnpm:`npm i -g pnpm`。
2. **后端服务要先起**(前端 dev 通过代理打到后端,见下表)。前端**只代理、不内置**后端:
   - `aitalky-app`:**8080**(REST,`/api` 代理目标)
   - `aitalky-ws`:**9100**(Netty WebSocket,`/ws` 代理目标)
   - 中间件:MySQL / Redis / MongoDB / RocketMQ(nameserver 9876)/ MinIO(9000)
   - 后端启动命令见根目录 `CLAUDE.md` §4(注意必须用 JDK21)。

> 只做纯前端 UI 调试可以不起后端,但登录/会话/消息等真实数据需要后端在跑。

---

## 二、安装依赖（仓库根执行一次)

```bash
cd aitalky-web
pnpm install        # 安装所有 app 的依赖(monorepo 一次装全)
```

---

## 三、本地运行各端（dev,热更新）

在 `aitalky-web/` 目录下任选:

```bash
# 坐席工作台 → http://localhost:5173
pnpm console
#（等价 pnpm --filter @aitalky/console dev)

# 信使端 H5 → http://localhost:5174
pnpm messenger
#（等价 pnpm --filter @aitalky/messenger dev)
```

> 两个端可**同时**各开一个终端跑(端口不冲突),配合验证「客户发消息 ↔ 坐席台实时收到」。

### 信使端接入 URL（必须带参数)
信使端靠 URL query 接入,直接打开 `http://localhost:5174` 会提示"初始化失败"。正确方式带参数:

```
http://localhost:5174/?appId=<项目的appId>&userId=<业务用户ID>&lang=zh_CN
```

- `appId`:目标项目的 appId(取后端种子项目 / 项目设置里的接入 ID)。
- `userId`:你的业务系统用户 ID(同一 userId 复用同一客户与会话);也可用 `visitorId=` 走游客。
- `lang`:`zh_CN` / `en_US`(默认 zh_CN)。

---

## 四、构建 / 校验

```bash
# 单个端构建(产物在各自 apps/*/dist)
pnpm --filter @aitalky/console build
pnpm --filter @aitalky/messenger build

# 全部端一起:构建 / lint
pnpm build          # = pnpm -r build
pnpm lint           # = pnpm -r lint
```

---

## 五、代理与端口对照（vite dev)

每个 app 的 `vite.config.ts` 里配了开发代理,避免跨域:

| 前端请求 | 代理到 | 用途 |
|---|---|---|
| `/api/**` | `http://localhost:8080` | 后端 REST |
| `/ws` | `ws://localhost:9100` | WebSocket 实时网关(Netty) |

改后端端口时同步改各 app 的 `vite.config.ts`。

---

## 六、端到端联调建议

1. 起后端:`aitalky-app`(8080)+ `aitalky-ws`(9100)+ 中间件。
2. `pnpm console`(5173)登录进项目;另开终端 `pnpm messenger`(5174)。
3. 浏览器开 `http://localhost:5174/?appId=<appId>&userId=u1`,客户发一条消息。
4. 坐席台收件箱应**实时**出现该会话并能回复;信使端**实时**收到回复。
5. 验证**漏消息补偿**:信使端发消息后断网几秒(DevTools → Network → Offline)再恢复,
   消息应**无需刷新自动补上**(原理见 `../doc/design/消息可靠投递与漏消息补偿.md`)。
