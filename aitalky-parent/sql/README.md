# 数据库初始化脚本

> MySQL 8 · 字符集 `utf8mb4` · 排序规则 `utf8mb4_general_ci`
> 表结构设计权威见 `../../doc/design/ddl-mysql.sql`;本目录为可执行版。

## 文件

| 文件 | 作用 |
|---|---|
| `01-schema.sql` | 建库 + 建表(26 张表,含 `DROP TABLE IF EXISTS`,可重复执行) |
| `02-seed.sql`   | 种子数据:平台管理员/套餐/配额/加量包/协议 + 3 角色权限模板(参考) |

## 执行顺序

```bash
mysql -uroot -p < 01-schema.sql      # 建库 aitalky + 26 表
mysql -uroot -p aitalky < 02-seed.sql # 灌入平台级种子数据
```

或合并执行:

```bash
cat 01-schema.sql 02-seed.sql | mysql -uroot -p
```

## 说明

- **库名** `aitalky`,与 `aitalky-app` / `aitalky-admin` 的 `application.yml` 默认 `MYSQL_DB:aitalky` 一致。
- **ID 策略**:种子用固定小 ID(1,2,3…),运行期业务数据用雪花 ID(极大),两者不冲突。
- **密码占位**:`pf_admin.password_hash` 为占位符,实现登录(identity/auth)时用 BCrypt 重设;**生产必须改**。
- **3 个系统角色**(负责人/管理员/普通成员)是**项目级**数据,由 identity 模块在「创建项目」时按 `project_id` 写入(`is_system=1`,名/权限不可改),不在全局种子里;`02-seed.sql` 末尾给出权限 JSON 模板。
- **消息**在 MongoDB,无需建表(集合 `messages` 首次写入自动创建,索引由 message 模块启动时建)。
