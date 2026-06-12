-- 黑名单快照列:拉黑时记录客户信息与操作人,供列表展示(对齐参考系统列:用户名/联系方式/邮箱/所在地/操作者)。
-- UID/MID 由现有 target_type + target_value 派生,不另存列。
ALTER TABLE `sup_blacklist`
  ADD COLUMN `customer_name` varchar(128) DEFAULT NULL COMMENT '客户名称(拉黑时快照)' AFTER `reason`,
  ADD COLUMN `contact`       varchar(128) DEFAULT NULL COMMENT '联系方式(拉黑时快照)' AFTER `customer_name`,
  ADD COLUMN `email`         varchar(128) DEFAULT NULL COMMENT '邮箱(拉黑时快照)' AFTER `contact`,
  ADD COLUMN `location`      varchar(255) DEFAULT NULL COMMENT '所在地(拉黑时快照,来自会话IP定位)' AFTER `email`,
  ADD COLUMN `operator_name` varchar(128) DEFAULT NULL COMMENT '操作者昵称(拉黑时快照)' AFTER `location`;
