-- 订阅计费:扩展包对齐参考系统
-- 1) 套餐自带席位统一改为 1(对齐参考:超出靠席位包单独购买);改前先把现有订阅的「旧自带席位-1」转成加购席位,保证现有订阅有效席位不变(有效席位=套餐席位+加购席位)。
-- 2) 翻译包改价 $69、新增 AI Tokens 加量包($20/百万);
-- 3) 新建项目级永久加量包配额表 bil_project_resource(customer/translate_char/ai_tokens 永久有效、脱离订阅);
-- 4) 把旧的 bil_subscription.extra_customers 迁移到新表(保老数据,列暂不删)。

-- ① 现有订阅:把旧自带席位超过 1 的部分转成加购席位(必须在改 pf_plan_quota 之前跑,依赖旧 amount)
UPDATE `bil_subscription` s
JOIN `pf_plan_quota` q ON q.`plan_id` = s.`plan_id` AND q.`resource_type` = 'seat' AND q.`del_flag` = 0
SET s.`seats` = s.`seats` + GREATEST(q.`amount` - 1, 0),
    s.`update_time` = NOW()
WHERE s.`del_flag` = 0;

-- ② 所有套餐自带席位改为 1
UPDATE `pf_plan_quota` SET `amount` = 1, `update_time` = NOW()
WHERE `resource_type` = 'seat';

-- ③ 翻译包改价 $69/百万字符(对齐参考)
UPDATE `pf_addon_pack` SET `price` = 69.00000000, `update_time` = NOW()
WHERE `code` = 'pack_translate_1m';

-- ④ 新增 AI Tokens 加量包(100万 tokens = $20)
INSERT INTO `pf_addon_pack` (`id`,`code`,`name`,`resource_type`,`spec_amount`,`price`,`currency`,`status`,`create_by`,`create_time`) VALUES
(4,'pack_aitokens_1m','AI Tokens包(100万Tokens)','ai_tokens',1000000,20.00000000,'USD',1,0,NOW());

-- ⑤ 项目级永久加量包配额表(已购的 customer/translate_char/ai_tokens 永久累计,不随订阅到期)
CREATE TABLE `bil_project_resource` (
  `id`               bigint      NOT NULL COMMENT '主键(雪花ID)',
  `project_id`       bigint      NOT NULL COMMENT '项目id(租户)',
  `resource_type`    varchar(32) NOT NULL COMMENT '资源类型 customer/translate_char/ai_tokens(永久加量包)',
  `purchased_amount` bigint      NOT NULL DEFAULT 0 COMMENT '已购加量包配额累计(永久,不随订阅到期)',
  `create_by`        bigint      DEFAULT NULL COMMENT '创建者',
  `create_time`      datetime    DEFAULT NULL COMMENT '创建时间',
  `update_by`        bigint      DEFAULT NULL COMMENT '更新者',
  `update_time`      datetime    DEFAULT NULL COMMENT '更新时间',
  `del_flag`         tinyint     NOT NULL DEFAULT 0 COMMENT '删除标志 0存在 1删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_project_res` (`project_id`,`resource_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='项目级永久加量包配额';

-- ⑥ 迁移旧 extra_customers → 新表 customer 行(复用订阅 id 作为行 id:唯一且与未来雪花ID不冲突)
INSERT INTO `bil_project_resource` (`id`,`project_id`,`resource_type`,`purchased_amount`,`create_by`,`create_time`)
SELECT s.`id`, s.`project_id`, 'customer', s.`extra_customers`, 0, NOW()
FROM `bil_subscription` s
WHERE s.`extra_customers` > 0 AND s.`del_flag` = 0;
