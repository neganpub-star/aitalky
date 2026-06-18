-- ============================================================
-- 订阅操作日志:后管手动开通/停用订阅留痕(用户下单走 bil_order,不在此表)。
-- 抽屉「变更记录」展示;字段存结构化值,前端按 i18n 格式化。
-- ============================================================
CREATE TABLE IF NOT EXISTS `bil_subscription_log` (
  `id`              bigint       NOT NULL COMMENT '主键(雪花ID)',
  `project_id`      bigint       NOT NULL COMMENT '项目ID',
  `action`          varchar(16)  NOT NULL COMMENT '动作 grant手动开通/cancel停用',
  `plan_name`       varchar(64)  DEFAULT NULL COMMENT '套餐名(grant 时)',
  `seats`           int          DEFAULT NULL COMMENT '加购席位(grant 时)',
  `extra_customers` int          DEFAULT NULL COMMENT '加购客户配额(grant 时)',
  `expire_time`     datetime     DEFAULT NULL COMMENT '到期时间(grant 时)',
  `operator`        bigint       DEFAULT NULL COMMENT '操作后管账号ID',
  `create_by`       bigint       DEFAULT NULL,
  `create_time`     datetime     DEFAULT NULL,
  `update_by`       bigint       DEFAULT NULL,
  `update_time`     datetime     DEFAULT NULL,
  `del_flag`        tinyint      NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_project` (`project_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订阅操作日志';
