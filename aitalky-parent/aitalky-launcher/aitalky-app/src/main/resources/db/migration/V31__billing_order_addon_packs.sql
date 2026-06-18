-- 订阅/续费订单搭售加量包:记录本单附带购买的永久加量包(核销时一并发放到 bil_project_resource)
-- 格式:resourceType:包数,逗号分隔,如 "translate_char:2,ai_tokens:1,customer:3"
ALTER TABLE `bil_order`
  ADD COLUMN `addon_packs` varchar(255) DEFAULT NULL COMMENT '搭售加量包(resourceType:包数,逗号分隔;扩展包独立单为空)' AFTER `quantity`;
