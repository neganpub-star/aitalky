-- 资源已消耗量持久化:翻译字符/AI Tokens 的累计消耗存 DB(原存 Redis,重启丢失致计费不准)。
-- 可用 = 免费默认(pf_config default_*) + 已购包(purchased_amount) - 已消耗(used_amount)。
-- 注:customer/seat 等走实时计数(成员数/客户数),不用此列;此列仅 translate_char/ai_tokens 累计消耗。
ALTER TABLE `bil_project_resource`
  ADD COLUMN `used_amount` bigint NOT NULL DEFAULT 0 COMMENT '已消耗量(translate_char/ai_tokens 累计;customer 走实时计数不用)' AFTER `purchased_amount`;
