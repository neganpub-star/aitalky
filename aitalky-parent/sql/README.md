# 数据库脚本目录

> 权威 schema 以 Flyway 迁移为准:`aitalky-launcher/aitalky-app/src/main/resources/db/migration/V*.sql`。
> 本目录是**导出快照 + 工具脚本**,方便快速建库/还原/清理,不替代 Flyway。

## 文件

| 文件 | 说明 |
|---|---|
| `schema.sql` | 全库**纯结构**快照(35 表,带 `DROP TABLE`,不含数据;已排除 `flyway_schema_history`) |
| `aitalky_full.sql` | 全库**结构 + 数据**完整快照,可直接还原(已排除 `flyway_schema_history`) |
| `clean-test-data.sh` | 清理一轮聊天测试数据(客户/会话/消息/黑名单),保留配置/成员/订阅 |

## 用法

### 快速还原整库(结构+数据)
```bash
mysql -uroot -pnegan123456 -e "CREATE DATABASE IF NOT EXISTS aitalky DEFAULT CHARSET utf8mb4"
mysql -uroot -pnegan123456 aitalky < sql/aitalky_full.sql
```
> 注意:此方式**绕过 Flyway**。还原后若再启动应用,Flyway 会因缺少 `flyway_schema_history`
> 而尝试从 V1 重跑迁移并报「表已存在」。仅用于一次性还原/查看;正常开发请用空库 + 让应用启动自动迁移。

### 只建结构
```bash
mysql -uroot -pnegan123456 aitalky < sql/schema.sql
```

### 清理测试数据(重复测试用)
```bash
bash sql/clean-test-data.sh        # 交互确认
bash sql/clean-test-data.sh -y     # 跳过确认
```

## 重新导出快照
```bash
cd aitalky-parent
mysqldump -uroot -pnegan123456 --no-data --compact --ignore-table=aitalky.flyway_schema_history aitalky > sql/schema.sql
mysqldump -uroot -pnegan123456 --single-transaction --ignore-table=aitalky.flyway_schema_history aitalky > sql/aitalky_full.sql
```
