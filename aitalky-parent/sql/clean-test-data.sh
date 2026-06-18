#!/usr/bin/env bash
# ============================================================
# 清理「客户 + 会话 + 消息 + 黑名单」测试数据(本地开发用)
#   - MySQL : cus_customer(客户)、cnv_conversation(会话)、cnv_assign_log(分配流水)、sup_blacklist(黑名单)
#   - Mongo : aitalky.messages(消息明细)
#   - Redis : conv:seq:*(会话内消息自增序号)
# 保留:分配规则/专属策略/参与队友(asn_*、cnv_assign_config、cnv_assign_member)、
#       成员、信使配置、计费订阅等——只清一轮聊天测试产生的数据,方便重复测试。
#   注:Redis 的 lock:conv:* / lock:customer:* 是短时锁,自动过期,无需清理。
#
# 用法:
#   bash doc/scripts/clean-test-data.sh        # 交互确认后清理
#   bash doc/scripts/clean-test-data.sh -y      # 跳过确认直接清理
# ============================================================
set -euo pipefail

# ---- 本地连接参数(与各 application.yml 一致;上线/换环境改这里)----
MYSQL_USER="root"
MYSQL_PWD="negan123456"
MYSQL_DB="aitalky"
MONGO_URI="mongodb://localhost:27017/aitalky"
REDIS_DB="0"

# 要清空的 MySQL 表(改这里即可增减;父子无外键约束,顺序无所谓)
MYSQL_TABLES=(cus_customer cnv_conversation cnv_assign_log sup_blacklist)

MYSQL=(mysql -u"$MYSQL_USER" -p"$MYSQL_PWD" "$MYSQL_DB" -N)

count() {
  for tb in "${MYSQL_TABLES[@]}"; do
    printf '  %-18s = %s\n' "$tb" "$("${MYSQL[@]}" -e "SELECT COUNT(*) FROM $tb" 2>/dev/null)"
  done
  printf '  %-18s = %s\n' "mongo messages" "$(mongosh "$MONGO_URI" --quiet --eval 'db.messages.countDocuments({})' 2>/dev/null)"
  printf '  %-18s = %s\n' "redis conv:seq:*" "$(redis-cli -n "$REDIS_DB" --scan --pattern 'conv:seq:*' 2>/dev/null | wc -l | tr -d ' ')"
}

echo "== 清理前 =="
count

if [[ "${1:-}" != "-y" ]]; then
  read -r -p "确认清空以上客户/会话/消息数据?(y/N) " ans
  [[ "$ans" == "y" || "$ans" == "Y" ]] || { echo "已取消"; exit 0; }
fi

echo "== 清理中 =="
# MySQL:TRUNCATE 比 DELETE 快且重置自增(逐表执行,单表失败不影响其余)
for tb in "${MYSQL_TABLES[@]}"; do
  "${MYSQL[@]}" -e "TRUNCATE TABLE $tb" 2>/dev/null && echo "  MySQL  ✔ $tb 已清空"
done

# Mongo:删消息集合全部文档(保留集合与索引)
mongosh "$MONGO_URI" --quiet --eval 'db.messages.deleteMany({})' >/dev/null 2>&1
echo "  Mongo  ✔ messages 已清空"

# Redis:删会话序号 key(--scan 不阻塞;无匹配时 xargs 不执行 del)
redis-cli -n "$REDIS_DB" --scan --pattern 'conv:seq:*' 2>/dev/null | xargs -r redis-cli -n "$REDIS_DB" del >/dev/null 2>&1 || true
echo "  Redis  ✔ conv:seq:* 已清空"

echo "== 清理后 =="
count
echo "完成。"
