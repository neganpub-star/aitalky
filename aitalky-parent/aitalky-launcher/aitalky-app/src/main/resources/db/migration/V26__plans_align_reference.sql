-- ============================================================
-- 套餐订阅 1:1 对齐参考系统(ByteTrack):5 个套餐 + 功能/配额/价格照参考。
-- 关键:团队席位、翻译都是「单独购买」,不作为套餐卡功能项;公网文章/应用站点带配额数。
-- 没做的功能(article/site/flow/domain/dedicated/ai_employee/insight/marketing/定制版四项)先占位展示,后续逐个补。
-- bil_subscription/bil_order 当前为空,重建套餐安全。pf_plan/pf_plan_quota 为配置表,物理重置。
-- ============================================================

DELETE FROM `pf_plan_quota`;
DELETE FROM `pf_plan`;

-- 套餐(features=套餐卡按顺序展示的功能码;团队席位/翻译不在其中)
INSERT INTO `pf_plan` (`id`,`code`,`name`,`level`,`monthly_price`,`currency`,`min_months`,`is_custom`,`features`,`status`,`create_by`,`create_time`) VALUES
(1,'basic',   '基础版',1, 49.00000000,'USD',6,0, JSON_ARRAY('inbox','messenger','article','site'),                                                          1,0,NOW()),
(2,'standard','标准版',2, 99.00000000,'USD',6,0, JSON_ARRAY('inbox','messenger','article','site','flow'),                                                   1,0,NOW()),
(3,'pro',     '专业版',3,149.00000000,'USD',6,0, JSON_ARRAY('inbox','messenger','article','site','domain','dedicated','flow','ai_employee','insight'),       1,0,NOW()),
(4,'flagship','旗舰版',4,199.00000000,'USD',6,0, JSON_ARRAY('inbox','messenger','article','site','domain','dedicated','flow','ai_employee','insight','marketing'),1,0,NOW()),
(5,'custom',  '定制版',5,  0.00000000,'USD',6,1, JSON_ARRAY('data_private','standalone','custom_domain','support_247'),                                     1,0,NOW());

-- 套餐配额(seat 团队席位[单独购买的基数] / article 公网文章 / site 应用站点 / customer 客户配额 / translate_char 翻译字符[单独购买基数];is_unlimited=1 无限)
INSERT INTO `pf_plan_quota` (`id`,`plan_id`,`resource_type`,`amount`,`is_unlimited`,`create_by`,`create_time`) VALUES
-- 基础版
(1, 1,'seat',           3,        0,0,NOW()),
(2, 1,'article',        20,       0,0,NOW()),
(3, 1,'site',           1,        0,0,NOW()),
(4, 1,'customer',       5000,     0,0,NOW()),
(5, 1,'translate_char', 1000000,  0,0,NOW()),
-- 标准版
(6, 2,'seat',           10,       0,0,NOW()),
(7, 2,'article',        200,      0,0,NOW()),
(8, 2,'site',           5,        0,0,NOW()),
(9, 2,'customer',       50000,    0,0,NOW()),
(10,2,'translate_char', 5000000,  0,0,NOW()),
-- 专业版
(11,3,'seat',           30,       0,0,NOW()),
(12,3,'article',        500,      0,0,NOW()),
(13,3,'site',           10,       0,0,NOW()),
(14,3,'customer',       0,        1,0,NOW()),
(15,3,'translate_char', 20000000, 0,0,NOW()),
-- 旗舰版(公网文章/应用站点/客户/翻译 无限)
(16,4,'seat',           30,       0,0,NOW()),
(17,4,'article',        0,        1,0,NOW()),
(18,4,'site',           0,        1,0,NOW()),
(19,4,'customer',       0,        1,0,NOW()),
(20,4,'translate_char', 0,        1,0,NOW());
-- 定制版:私有化部署,不设配额
