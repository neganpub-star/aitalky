-- ============================================================
-- 概览扩展服务默认值(未订阅项目展示的免费额度):翻译包/AI Tokens/客户拓展包。
-- 后管参数管理可改。INSERT IGNORE 幂等。
-- ============================================================
INSERT IGNORE INTO `pf_config` (`id`,`config_key`,`config_value`,`name`,`remark`,`config_group`,`sort`,`status`,`create_by`,`create_time`) VALUES
(4,'default_translate_char','200', '默认翻译包(字符)',    '未订阅项目概览展示的翻译包默认额度(字符)','quota',4,1,0,NOW()),
(5,'default_ai_tokens',     '4000','默认AI Tokens',       '未订阅项目概览展示的 AI Tokens 默认额度',  'quota',5,1,0,NOW()),
(6,'default_customer',      '100', '默认客户拓展包(配额)', '未订阅项目概览展示的客户配额默认额度',     'quota',6,1,0,NOW());
