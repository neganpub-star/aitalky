-- Flyway V3: 操作日志表(敏感操作留痕)
SET NAMES utf8mb4;

CREATE TABLE `sys_oper_log` (
  `id`          bigint       NOT NULL COMMENT '主键(雪花ID)',
  `project_id`  bigint       DEFAULT NULL COMMENT '项目id(平台操作为空)',
  `operator_id` bigint       DEFAULT NULL COMMENT '操作人(成员id/账号id)',
  `action`      varchar(128) NOT NULL COMMENT '操作描述',
  `method`      varchar(256) DEFAULT NULL COMMENT '方法(类.方法)',
  `params`      text         COMMENT '请求参数(仅 @Log(saveParams=true) 时记录,不含敏感字段)',
  `ip`          varchar(64)  DEFAULT NULL COMMENT '操作IP',
  `cost_ms`     bigint       DEFAULT NULL COMMENT '耗时(毫秒)',
  `success`     tinyint      NOT NULL DEFAULT 1 COMMENT '是否成功 1是 0否',
  `error_msg`   varchar(512) DEFAULT NULL COMMENT '失败信息',
  `create_time` datetime     DEFAULT NULL COMMENT '操作时间',
  PRIMARY KEY (`id`),
  KEY `idx_project` (`project_id`),
  KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='操作日志';
