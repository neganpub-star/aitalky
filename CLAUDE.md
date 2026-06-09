# aitalky 项目规则(新会话务必先读)

aitalky = 参考 **ByteTrack**(bytrack.com)重写的多租户智能客服 SaaS。本文件是项目铁律,违反会被要求返工。

## 0. 接手新会话:先读这些
1. 本文件(规则)2. `doc/开发进度清单.md`(干到哪、接着干哪)3. `~/.claude/projects/-Users-macintoshhd-work-customerService/memory/MEMORY.md`(记忆)4. `doc/design/`(设计)5. `git log --oneline`(已落地)

## 1. 铁律:UI 1:1 对齐 ByteTrack
- 前端任何页面**必须照 ByteTrack 像素级复刻**:布局、组件、间距、**字体**(全局 `token.fontSize=15`)。参考截图在 `doc/bytrack/images/`(尤其 `418-getting-started/`),没有就找用户要,**不要自由发挥**。
- 列宽/颜色用 DevTools 量的精确值(已对齐:图标栏44/#e9eef8,分类视图224/#f7f7f7,会话列表300,边框0.5px rgba(0,0,0,.1))。
- **唯一允许比参考多的**:白天/黑夜主题切换(在头像菜单内,带图标)。品牌 LOGO 用 cicada 的「Ai」气泡图(`apps/console/src/assets/logo.png` + favicon)。

## 2. 目录与技术栈
- 后端 `aitalky-parent/`:Maven 模块化单体,Java21 + SpringBoot3 + MyBatis-Plus + MySQL/Mongo/Redis/RocketMQ/MinIO。分组:`aitalky-base`(common/framework)、`aitalky-modules`(platform/identity/messenger/routing/customer/conversation/message/billing)、`aitalky-launcher`(app 8080 / admin 8090 / ws 9100,Netty)。
- 前端 `aitalky-web/`:pnpm monorepo,`apps/console`(坐席台,React+TS+Vite+AntD)。后续 admin / im-h5。

## 3. 编码规范
- **后端**:中文注释讲"为什么";简洁(record/Optional/Stream);分层=Controller编排·Service事务·Mapper存取,**模块间只调对方 Service 接口,不碰对方表**;统一响应 `R` + 业务异常 `BizException`(带 i18n key);不返回 null、不裸抛 RuntimeException;敏感数据(密码)不打日志;金额 BigDecimal;主键雪花ID。新状态字段优先用枚举。
- **前端**:简洁易读;文案一律走 `t()`(react-i18next,中英);登录态/主题/语言用 `useAppStore`(Zustand);权限判断用 `auth/perm`。
- **RBAC**:接口加 `@RequiresFunction("xxx")`;前端按 functions 渲染菜单(菜单隔离),后端独立校验(数据隔离=多租户 project_id 自动注入 + 功能权限)。

## 4. 构建 / 运行(关键:用 JDK21)
- 本机默认 JDK17,**必须指定 JDK21**:`JAVA_HOME=/Users/macintoshhd/Library/Java/JavaVirtualMachines/ms-21.0.11/Contents/Home`
- 编译:`cd aitalky-parent && JAVA_HOME=$J mvn -q -B -DskipTests compile`
- **改了 common/framework 等被依赖模块,要 `mvn ... install`(否则 .m2 旧快照被打进 jar)**;打包整体用 `mvn ... package`。
- 跑:`$J/bin/java -jar aitalky-launcher/aitalky-app/target/aitalky-app.jar`(ws 同理)。**用 JDK21 跑**(jar 是 class 65)。
- 前端:`cd aitalky-web && pnpm --filter @aitalky/console dev`(5173,`/api` 代理 → 8080);构建校验 `pnpm --filter @aitalky/console build`。
- 中间件均在本机:MySQL(root/`negan123456`,库 `aitalky`,Flyway 启动自动迁移)、Redis、MongoDB、RocketMQ(nameserver 9876 + broker 10911)、MinIO(9000)。

## 5. 配置 / 安全(本地)
- 配置**本地明文**写在各 `application.yml`(数据库密码/SMTP/RSA/JWT),上线改环境变量/配置中心。
- 登录:邮箱+密码(RSA加密传输,curl 测试用 openssl)+ 邮箱验证码 2FA;开发期**万能验证码 `888888`**。
- 验证码邮件复用 cicada SMTP(mail.devnew.top)。

## 6. 提交规范
- `<type>(<scope>): 描述`,scope=模块名或端(identity/messenger/conversation/web/ws...);type=feat/fix/refactor/chore/docs。
- 每完成一个最小功能即本地提交;不推送除非用户要;commit footer:`Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`。
- 不提交 node_modules/target/dist;不把改对方模块的东西混在一个 commit。

## 7. 会话/消息 现状(P1/P2 已落地)
- 信使端鉴权=客户令牌(scope=customer);会话(收件箱视图mine/unassigned/all+认领/结束/未读);消息(Mongo+Redis seq+发送者快照+内部消息过滤);坐席REST + 信使REST 全通;WS 实时推送(app→RocketMQ→ws→坐席+客户)流水线已打通。
- **代发归属=真实发送成员**(负责人代发显示负责人,不伪装);发送者昵称/头像是**发送时快照**(改资料不回溯)。
