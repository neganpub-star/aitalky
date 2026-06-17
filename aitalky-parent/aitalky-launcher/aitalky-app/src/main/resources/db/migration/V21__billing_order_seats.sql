-- ============================================================
-- 订阅计费 第③期:下单含"席位加购",订单与订阅各加 seats 列
-- seats = 套餐自带席位之外的加购数量;有效席位 = 套餐 seat 配额 + 订阅 seats。
-- ============================================================

ALTER TABLE `bil_order`
  ADD COLUMN `seats` int NOT NULL DEFAULT 0 COMMENT '加购席位数(套餐配额之外)' AFTER `months`;

ALTER TABLE `bil_subscription`
  ADD COLUMN `seats` int NOT NULL DEFAULT 0 COMMENT '加购席位数(套餐配额之外)' AFTER `plan_name`;
