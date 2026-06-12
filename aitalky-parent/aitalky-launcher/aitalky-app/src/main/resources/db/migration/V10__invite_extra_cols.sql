-- 团队成员模块:邀请相关表扩列
-- 邮箱邀请:记录发送次数(再次邀请累加)与接受后生成的成员id(列表"成员"列展示)
ALTER TABLE `id_invite`
  ADD COLUMN `send_count`         int    NOT NULL DEFAULT 1  COMMENT '邀请发送次数(再次邀请累加)' AFTER `status`,
  ADD COLUMN `accepted_member_id` bigint DEFAULT NULL         COMMENT '接受后生成的成员id' AFTER `inviter_member_id`;

-- 链接邀请:公开/私密(私密需输入验证码才能加入,对齐现网"邀请形式")
ALTER TABLE `id_invite_link`
  ADD COLUMN `access_type` tinyint     NOT NULL DEFAULT 0 COMMENT '邀请形式 0公开(任何人可加入) 1私密(需验证码)' AFTER `role_id`,
  ADD COLUMN `access_code` varchar(16) DEFAULT NULL        COMMENT '私密链接的访问验证码' AFTER `access_type`;

-- 项目 Logo(基本信息页"更换图标";邀请落地页展示)
ALTER TABLE `id_project`
  ADD COLUMN `logo` varchar(256) DEFAULT NULL COMMENT '项目 Logo(对象存储URL)' AFTER `name`;
