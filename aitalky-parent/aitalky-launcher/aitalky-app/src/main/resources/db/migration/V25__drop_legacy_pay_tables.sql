-- ============================================================
-- 清理早期计费初版的废弃表(V1 建,后被 bil_* 一套取代,全项目零引用、零数据)
--   pay_order        旧支付订单    → bil_order
--   pay_quota        旧资源配额用量 → 配额计量改由 /billing/usage 实时算(成员/客户数 vs 套餐配额)
--   pay_subscription 旧订阅        → bil_subscription
-- 注:V1 已 apply,不能改其建表语句(Flyway 校验和),故保留 V1 原样,用本迁移 DROP。
-- ============================================================

DROP TABLE IF EXISTS `pay_order`;
DROP TABLE IF EXISTS `pay_quota`;
DROP TABLE IF EXISTS `pay_subscription`;
