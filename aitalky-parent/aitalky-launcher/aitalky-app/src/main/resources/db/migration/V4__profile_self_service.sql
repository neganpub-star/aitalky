-- Flyway V4: 个人中心自助(用户名/邀请码/账号裂变) + 系统推送细分开关
-- 对齐参考系统(ByteTrack)个人中心:基本资料新增 用户名(独立显示名)/邀请码(注册裂变);系统推送 4 类 x APP/Web
SET NAMES utf8mb4;

-- ===== 账号:用户名(可改显示名) + 邀请码(注册裂变,全局唯一) + 邀请人 =====
ALTER TABLE `id_account`
  ADD COLUMN `username`           varchar(64) DEFAULT NULL COMMENT '用户名(账号显示名,可改)' AFTER `email`,
  ADD COLUMN `invite_code`        varchar(16) DEFAULT NULL COMMENT '邀请码(注册裂变码,全局唯一)' AFTER `username`,
  ADD COLUMN `inviter_account_id` bigint      DEFAULT NULL COMMENT '邀请人账号id(注册时所填邀请码归属)' AFTER `invite_code`;

-- 存量账号回填:用户名默认取邮箱前缀;邀请码用账号信息派生 8 位短码(数据量小,碰撞概率可忽略)
UPDATE `id_account` SET `username` = SUBSTRING_INDEX(`email`, '@', 1) WHERE `username` IS NULL;
UPDATE `id_account` SET `invite_code` = UPPER(SUBSTRING(MD5(CONCAT(`id`, '-', `email`)), 1, 8)) WHERE `invite_code` IS NULL;

ALTER TABLE `id_account` ADD UNIQUE KEY `uk_invite_code` (`invite_code`);

-- ===== 成员:系统推送细分(4 类消息 x APP/Web 共 8 个开关) =====
-- 默认贴合参考:常规推送默认开,新客户提醒 APP 默认关、Web 默认开
ALTER TABLE `id_member`
  ADD COLUMN `push_assigned_app`     tinyint NOT NULL DEFAULT 1 COMMENT '推送-分配给我的会话客户消息(APP)',
  ADD COLUMN `push_assigned_web`     tinyint NOT NULL DEFAULT 1 COMMENT '推送-分配给我的会话客户消息(Web)',
  ADD COLUMN `push_unassigned_app`   tinyint NOT NULL DEFAULT 1 COMMENT '推送-未分配会话客户消息(APP)',
  ADD COLUMN `push_unassigned_web`   tinyint NOT NULL DEFAULT 1 COMMENT '推送-未分配会话客户消息(Web)',
  ADD COLUMN `push_mention_app`      tinyint NOT NULL DEFAULT 1 COMMENT '推送-提到我的消息(APP)',
  ADD COLUMN `push_mention_web`      tinyint NOT NULL DEFAULT 1 COMMENT '推送-提到我的消息(Web)',
  ADD COLUMN `push_new_customer_app` tinyint NOT NULL DEFAULT 0 COMMENT '推送-新客户提醒(APP)',
  ADD COLUMN `push_new_customer_web` tinyint NOT NULL DEFAULT 1 COMMENT '推送-新客户提醒(Web)';
