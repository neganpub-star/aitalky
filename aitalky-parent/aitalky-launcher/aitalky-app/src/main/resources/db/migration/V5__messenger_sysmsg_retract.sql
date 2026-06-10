-- 信使设置补充字段:系统消息显示开关 + 客户撤回消息权限
-- 系统消息显示:控制信使端是否展示「未读 / 正在输入中 / 成员撤回消息」系统提示
-- 客户撤回消息权限:是否允许信使端(客户)主动撤回自己发的消息
ALTER TABLE `mse_messenger`
    ADD COLUMN `sys_msg_unread`           tinyint NOT NULL DEFAULT 1 COMMENT '系统消息-未读 1显示 0隐藏' AFTER `popup_allow_close`,
    ADD COLUMN `sys_msg_typing`           tinyint NOT NULL DEFAULT 1 COMMENT '系统消息-正在输入中 1显示 0隐藏' AFTER `sys_msg_unread`,
    ADD COLUMN `sys_msg_member_retract`   tinyint NOT NULL DEFAULT 1 COMMENT '系统消息-成员撤回消息 1显示 0隐藏' AFTER `sys_msg_typing`,
    ADD COLUMN `customer_retract_enabled` tinyint NOT NULL DEFAULT 1 COMMENT '客户撤回消息权限 1允许 0禁止' AFTER `sys_msg_member_retract`;

-- 信使启用语种(每项目多条;对齐参考系统 getAppLanguage)。后管可编辑新增语种。
-- 取代 mse_messenger.enabled_languages / default_language(JSON 字段弃用,改以本表为准)
CREATE TABLE `mse_messenger_language` (
    `id`          bigint      NOT NULL COMMENT '主键(雪花ID)',
    `project_id`  bigint      NOT NULL COMMENT '项目id',
    `language`    varchar(16) NOT NULL COMMENT '语言编码,如 zh_CN/en_US',
    `type`        tinyint     NOT NULL DEFAULT 0 COMMENT '1默认语言 0其他语言',
    `sort`        int         NOT NULL DEFAULT 0 COMMENT '排序',
    `create_by`   bigint      DEFAULT NULL COMMENT '创建者',
    `create_time` datetime    DEFAULT NULL COMMENT '创建时间',
    `update_by`   bigint      DEFAULT NULL COMMENT '更新者',
    `update_time` datetime    DEFAULT NULL COMMENT '更新时间',
    `del_flag`    tinyint     NOT NULL DEFAULT 0 COMMENT '删除标志 0存在 1删除',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_project_lang` (`project_id`, `language`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='信使启用语种';
