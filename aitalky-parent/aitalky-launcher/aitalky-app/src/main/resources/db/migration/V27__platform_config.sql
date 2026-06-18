-- ============================================================
-- 平台参数管理(后管「参数管理」):key-value 配置,后管可改。
--   contact_telegram   客服 Telegram 链接(套餐订阅页「免费体验」横幅点击跳转)
--   order_expire_hours 订单支付有效期(小时),下单时取此值算 expire_time(原硬编码 24)
--   free_trial_days    免费体验天数(横幅文案)
-- ============================================================
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `pf_config` (
  `id`           bigint       NOT NULL COMMENT '主键(雪花ID)',
  `config_key`   varchar(64)  NOT NULL COMMENT '配置键(唯一)',
  `config_value` varchar(1024) DEFAULT NULL COMMENT '配置值',
  `name`         varchar(128) NOT NULL COMMENT '显示名称',
  `remark`       varchar(255) DEFAULT NULL COMMENT '说明',
  `config_group` varchar(32)  DEFAULT 'general' COMMENT '分组',
  `sort`         int          NOT NULL DEFAULT 0 COMMENT '排序',
  `status`       tinyint      NOT NULL DEFAULT 1 COMMENT '状态 1启用 0停用',
  `create_by`    bigint       DEFAULT NULL,
  `create_time`  datetime     DEFAULT NULL,
  `update_by`    bigint       DEFAULT NULL,
  `update_time`  datetime     DEFAULT NULL,
  `del_flag`     tinyint      NOT NULL DEFAULT 0 COMMENT '0存在 1删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_config_key` (`config_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='平台参数配置';

INSERT IGNORE INTO `pf_config` (`id`,`config_key`,`config_value`,`name`,`remark`,`config_group`,`sort`,`status`,`create_by`,`create_time`) VALUES
(1,'contact_telegram',  'https://t.me/aitalky',   '客服 Telegram',       '套餐订阅页「免费体验」横幅点击跳转的 Telegram 链接','contact',1,1,0,NOW()),
(2,'order_expire_hours','24',                     '订单支付有效期(小时)','下单后订单的支付有效时长,超时自动作废',           'billing',2,1,0,NOW()),
(3,'free_trial_days',   '15',                     '免费体验天数',        '套餐订阅页「免费体验」横幅展示的天数',             'billing',3,1,0,NOW());

-- 超级管理员补「参数管理 config」功能码(后管菜单显示 + 接口放行)
UPDATE `pf_admin_role`
SET `permissions` = '["users", "tenants", "subscriptions", "orders", "plans", "addons", "agreements", "stats", "dict", "admins", "roles", "config"]',
    `update_time` = NOW()
WHERE `id` = 1;
