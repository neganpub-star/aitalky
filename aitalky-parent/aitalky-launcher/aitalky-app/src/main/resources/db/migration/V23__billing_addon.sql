-- ============================================================
-- 订阅计费 加购:独立购买「席位 / 客户配额」(不换套餐、不重起算)
--   addon_seat     席位加购:按订阅剩余天数折算计价,只加 bil_subscription.seats,不改到期日
--   addon_customer 客户配额加购:永久配额包(一次性 price×包数),加 bil_subscription.extra_customers
-- 订单新增列区分加购:resource_type(seat/customer;套餐单为空)、quantity(客户配额加购的配额总数)、
--   period_days(席位加购的计价周期=下单时剩余天数;套餐/客户单为0)。
-- ============================================================

ALTER TABLE `bil_order`
  ADD COLUMN `resource_type` varchar(32) DEFAULT NULL COMMENT '加购资源类型 seat/customer;套餐单为空' AFTER `type`,
  ADD COLUMN `quantity`      int NOT NULL DEFAULT 0 COMMENT '客户配额加购:新增配额总数(套餐/席位单为0)' AFTER `seats`,
  ADD COLUMN `period_days`   int NOT NULL DEFAULT 0 COMMENT '席位加购计价周期=下单时剩余天数(套餐/客户单为0)' AFTER `quantity`;

ALTER TABLE `bil_subscription`
  ADD COLUMN `extra_customers` int NOT NULL DEFAULT 0 COMMENT '加购客户配额(套餐配额之外);有效客户配额=套餐 customer 配额 + 本字段' AFTER `seats`;

-- 客户拓展包种子(后管可改/可加):1000 客户配额/包,$20/包,一次性
INSERT INTO `pf_addon_pack` (`id`,`code`,`name`,`resource_type`,`spec_amount`,`price`,`currency`,`status`,`create_by`,`create_time`) VALUES
(3,'pack_customer_1k','客户拓展包(1000客户配额)','customer',1000,20.00000000,'USD',1,0,NOW());
