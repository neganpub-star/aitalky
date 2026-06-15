-- Flyway V16: 会话分配规则(普通分配)基础——分配配置 + 参与队友(均归 conversation 域)
-- 对齐 ByteTrack:分配规则(手动/轮流/负载)+ 最大会话数 + 参与自动分配的队友。

-- 项目分配配置(每项目一行;conversation 模块自管,避免跨 identity 读)
CREATE TABLE `cnv_assign_config` (
    `id`                 BIGINT   NOT NULL COMMENT '主键(雪花)',
    `project_id`         BIGINT   NOT NULL COMMENT '项目ID',
    `assign_mode`        TINYINT  NOT NULL DEFAULT 1 COMMENT '分配规则:0手动 1轮流 2负载(默认轮流)',
    `max_concurrent`     INT      NOT NULL DEFAULT 0 COMMENT '每坐席最大同时进行中会话数,0=不限',
    `round_robin_cursor` BIGINT   NULL COMMENT '轮流分配游标:上次分到的 member_id',
    `create_by`          BIGINT   NULL,
    `create_time`        DATETIME NULL,
    `update_by`          BIGINT   NULL,
    `update_time`        DATETIME NULL,
    `del_flag`           TINYINT  NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_project` (`project_id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '会话分配配置';

-- 普通分配模式:参与自动分配的队友
CREATE TABLE `cnv_assign_member` (
    `id`          BIGINT      NOT NULL COMMENT '主键(雪花)',
    `project_id`  BIGINT      NOT NULL COMMENT '项目ID',
    `member_id`   BIGINT      NOT NULL COMMENT '成员ID',
    `create_by`   BIGINT      NULL,
    `create_time` DATETIME    NULL,
    `update_by`   BIGINT      NULL,
    `update_time` DATETIME    NULL,
    `del_flag`    TINYINT     NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_project_member` (`project_id`, `member_id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '普通分配模式-参与队友';
