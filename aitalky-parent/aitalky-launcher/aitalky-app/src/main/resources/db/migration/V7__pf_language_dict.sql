-- Flyway V7: 平台级语种字典 pf_language
-- 背景:可选语种全集原为前端常量 apps/console/src/constants/languages.ts;
-- 迁到平台字典表后,后管可增删/停用语种,console 从接口读取,新增语种无需改代码。
-- 与项目级 mse_messenger_language(租户启用的语种)是两层:此表是"候选全集"。
SET NAMES utf8mb4;

CREATE TABLE `pf_language` (
  `id`          bigint      NOT NULL COMMENT '主键(雪花ID)',
  `code`        varchar(16) NOT NULL COMMENT '语言编码 zh_CN/en_US...',
  `zh_name`     varchar(64) NOT NULL COMMENT '中文名',
  `en_name`     varchar(64) NOT NULL COMMENT '英文名',
  `sort`        int         NOT NULL DEFAULT 0 COMMENT '排序(小在前)',
  `status`      tinyint     NOT NULL DEFAULT 1 COMMENT '状态 1启用 0停用',
  `create_by`   bigint      DEFAULT NULL COMMENT '创建者',
  `create_time` datetime    DEFAULT NULL COMMENT '创建时间',
  `update_by`   bigint      DEFAULT NULL COMMENT '更新者',
  `update_time` datetime    DEFAULT NULL COMMENT '更新时间',
  `del_flag`    tinyint     NOT NULL DEFAULT 0 COMMENT '删除标志 0存在 1删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='平台语种字典(候选全集)';

-- 种子:对齐原前端常量 languages.ts(18 种),sort 按原顺序
INSERT INTO `pf_language` (`id`,`code`,`zh_name`,`en_name`,`sort`,`status`,`create_by`,`create_time`) VALUES
(1, 'zh_CN','简体中文','Simplified Chinese',  1, 1,0,NOW()),
(2, 'en_US','英文',    'English',             2, 1,0,NOW()),
(3, 'zh_TW','繁体中文','Traditional Chinese', 3, 1,0,NOW()),
(4, 'vi_VN','越南语',  'Vietnamese',          4, 1,0,NOW()),
(5, 'my_MM','缅甸语',  'Burmese',             5, 1,0,NOW()),
(6, 'de_DE','德语',    'German',              6, 1,0,NOW()),
(7, 'it_IT','意大利语','Italian',             7, 1,0,NOW()),
(8, 'pt_PT','葡萄牙语','Portuguese',          8, 1,0,NOW()),
(9, 'ja_JP','日语',    'Japanese',            9, 1,0,NOW()),
(10,'ko_KR','韩语',    'Korean',             10, 1,0,NOW()),
(11,'id_ID','印尼语',  'Indonesian',         11, 1,0,NOW()),
(12,'ru_RU','俄语',    'Russian',            12, 1,0,NOW()),
(13,'th_TH','泰语',    'Thai',               13, 1,0,NOW()),
(14,'lo_LA','老挝语',  'Lao',                14, 1,0,NOW()),
(15,'fr_FR','法语',    'French',             15, 1,0,NOW()),
(16,'ms_MY','马来语',  'Malay',              16, 1,0,NOW()),
(17,'es_ES','西班牙语','Spanish',            17, 1,0,NOW()),
(18,'tr_TR','土耳其语','Turkish',            18, 1,0,NOW());

-- 给超级管理员角色补「dict」语种字典管理权限
UPDATE `pf_admin_role`
SET `permissions` = JSON_ARRAY('users','tenants','subscriptions','orders','plans','addons','agreements','stats','dict'),
    `update_time` = NOW()
WHERE `id` = 1;
