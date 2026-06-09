-- ============================================================
-- aitalky 数据库初始化 ① 表结构 (MySQL 8)
-- 字符集 utf8mb4 / 排序规则 utf8mb4_general_ci
-- 表结构以《doc/design/ddl-mysql.sql》为设计权威,本文件为可执行版(含建库+DROP)
-- 执行: mysql -uroot -p < 01-schema.sql
-- ============================================================
CREATE DATABASE IF NOT EXISTS `aitalky` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `aitalky`;
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `pf_admin`;
CREATE TABLE `pf_admin` (
  `id`            bigint       NOT NULL COMMENT '主键(雪花ID)',
  `username`      varchar(64)  NOT NULL COMMENT '登录名',
  `password_hash` varchar(128) NOT NULL COMMENT '密码哈希',
  `real_name`     varchar(64)  DEFAULT NULL COMMENT '姓名',
  `role_id`       bigint       DEFAULT NULL COMMENT '平台角色id',
  `status`        tinyint      NOT NULL DEFAULT 1 COMMENT '状态 1正常 0禁用',
  `create_by`     bigint       DEFAULT NULL COMMENT '创建者',
  `create_time`   datetime     DEFAULT NULL COMMENT '创建时间',
  `update_by`     bigint       DEFAULT NULL COMMENT '更新者',
  `update_time`   datetime     DEFAULT NULL COMMENT '更新时间',
  `del_flag`      tinyint      NOT NULL DEFAULT 0 COMMENT '删除标志 0存在 1删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='平台管理员账号';

DROP TABLE IF EXISTS `pf_admin_role`;
CREATE TABLE `pf_admin_role` (
  `id`          bigint      NOT NULL COMMENT '主键(雪花ID)',
  `name`        varchar(32) NOT NULL COMMENT '角色名称',
  `permissions` json        DEFAULT NULL COMMENT '平台模块权限,如["users","tenants","subscriptions","orders","plans","agreements","stats"]',
  `create_by`   bigint      DEFAULT NULL COMMENT '创建者',
  `create_time` datetime    DEFAULT NULL COMMENT '创建时间',
  `update_by`   bigint      DEFAULT NULL COMMENT '更新者',
  `update_time` datetime    DEFAULT NULL COMMENT '更新时间',
  `del_flag`    tinyint     NOT NULL DEFAULT 0 COMMENT '删除标志 0存在 1删除',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='平台角色';

-- 套餐(平台定义; 通用结构,V1 只配少量档位+席位/翻译/客户配额)
DROP TABLE IF EXISTS `pf_plan`;
CREATE TABLE `pf_plan` (
  `id`            bigint        NOT NULL COMMENT '主键(雪花ID)',
  `code`          varchar(32)   NOT NULL COMMENT '套餐编码',
  `name`          varchar(64)   NOT NULL COMMENT '套餐名称',
  `level`         int           NOT NULL DEFAULT 0 COMMENT '档位排序(越大越高)',
  `monthly_price` decimal(20,8) NOT NULL DEFAULT 0 COMMENT '每月价格',
  `currency`      varchar(16)   DEFAULT 'USD' COMMENT '计价币种',
  `min_months`    int           NOT NULL DEFAULT 6 COMMENT '起订月数',
  `is_custom`     tinyint       NOT NULL DEFAULT 0 COMMENT '是否定制版(私有化,费用另议)',
  `features`      json          DEFAULT NULL COMMENT '功能项(灵活,如["inbox","messenger","translate"])',
  `status`        tinyint       NOT NULL DEFAULT 1 COMMENT '状态 1上架 0下架',
  `create_by`     bigint        DEFAULT NULL COMMENT '创建者',
  `create_time`   datetime      DEFAULT NULL COMMENT '创建时间',
  `update_by`     bigint        DEFAULT NULL COMMENT '更新者',
  `update_time`   datetime      DEFAULT NULL COMMENT '更新时间',
  `del_flag`      tinyint       NOT NULL DEFAULT 0 COMMENT '删除标志 0存在 1删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='套餐';

-- 套餐含的资源配额(套餐×资源类型; 扩展资源只需加行,不改表)
DROP TABLE IF EXISTS `pf_plan_quota`;
CREATE TABLE `pf_plan_quota` (
  `id`            bigint      NOT NULL COMMENT '主键(雪花ID)',
  `plan_id`       bigint      NOT NULL COMMENT '套餐id',
  `resource_type` varchar(32) NOT NULL COMMENT '资源类型 seat=席位/translate_char=翻译字符/customer=客户配额',
  `amount`        bigint      NOT NULL DEFAULT 0 COMMENT '配额数量',
  `is_unlimited`  tinyint     NOT NULL DEFAULT 0 COMMENT '是否无限制 1是',
  `create_by`     bigint      DEFAULT NULL COMMENT '创建者',
  `create_time`   datetime    DEFAULT NULL COMMENT '创建时间',
  `update_by`     bigint      DEFAULT NULL COMMENT '更新者',
  `update_time`   datetime    DEFAULT NULL COMMENT '更新时间',
  `del_flag`      tinyint     NOT NULL DEFAULT 0 COMMENT '删除标志 0存在 1删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_plan_res` (`plan_id`,`resource_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='套餐资源配额';

-- 加量包定义(平台; V1 只有 翻译包/席位)
DROP TABLE IF EXISTS `pf_addon_pack`;
CREATE TABLE `pf_addon_pack` (
  `id`            bigint        NOT NULL COMMENT '主键(雪花ID)',
  `code`          varchar(32)   NOT NULL COMMENT '加量包编码',
  `name`          varchar(64)   NOT NULL COMMENT '名称',
  `resource_type` varchar(32)   NOT NULL COMMENT '资源类型 translate_char=翻译字符/seat=席位',
  `spec_amount`   bigint        NOT NULL DEFAULT 0 COMMENT '规格数量(如100万字符/1个席位)',
  `price`         decimal(20,8) NOT NULL DEFAULT 0 COMMENT '价格',
  `currency`      varchar(16)   DEFAULT 'USD' COMMENT '币种',
  `status`        tinyint       NOT NULL DEFAULT 1 COMMENT '状态 1上架 0下架',
  `create_by`     bigint        DEFAULT NULL COMMENT '创建者',
  `create_time`   datetime      DEFAULT NULL COMMENT '创建时间',
  `update_by`     bigint        DEFAULT NULL COMMENT '更新者',
  `update_time`   datetime      DEFAULT NULL COMMENT '更新时间',
  `del_flag`      tinyint       NOT NULL DEFAULT 0 COMMENT '删除标志 0存在 1删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='加量包定义';

-- 协议/法律文档(平台后管编辑; 多语言)
DROP TABLE IF EXISTS `pf_agreement`;
CREATE TABLE `pf_agreement` (
  `id`          bigint       NOT NULL COMMENT '主键(雪花ID)',
  `type`        varchar(32)  NOT NULL COMMENT '类型 terms服务条款/privacy隐私政策/subscription套餐订阅协议',
  `language`    varchar(16)  NOT NULL COMMENT '语言 zh_CN/en_US...',
  `title`       varchar(128) DEFAULT NULL COMMENT '标题',
  `content`     longtext     COMMENT '正文(富文本)',
  `version`     varchar(32)  DEFAULT NULL COMMENT '版本',
  `status`      tinyint      NOT NULL DEFAULT 1 COMMENT '状态 1发布 0草稿',
  `create_by`   bigint       DEFAULT NULL COMMENT '创建者',
  `create_time` datetime     DEFAULT NULL COMMENT '创建时间',
  `update_by`   bigint       DEFAULT NULL COMMENT '更新者',
  `update_time` datetime     DEFAULT NULL COMMENT '更新时间',
  `del_flag`    tinyint      NOT NULL DEFAULT 0 COMMENT '删除标志 0存在 1删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_type_lang` (`type`,`language`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='平台协议/法律文档';

-- ========================================================================
-- id_ 身份与租户
-- ========================================================================

DROP TABLE IF EXISTS `id_account`;
CREATE TABLE `id_account` (
  `id`            bigint       NOT NULL COMMENT '主键(雪花ID)',
  `email`         varchar(128) NOT NULL COMMENT '邮箱(登录名,收验证码)',
  `password_hash` varchar(128) NOT NULL COMMENT '密码哈希',
  `status`        tinyint      NOT NULL DEFAULT 1 COMMENT '状态 1正常 0禁用',
  `create_by`     bigint       DEFAULT NULL COMMENT '创建者',
  `create_time`   datetime     DEFAULT NULL COMMENT '创建时间',
  `update_by`     bigint       DEFAULT NULL COMMENT '更新者',
  `update_time`   datetime     DEFAULT NULL COMMENT '更新时间',
  `del_flag`      tinyint      NOT NULL DEFAULT 0 COMMENT '删除标志 0存在 1删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='租户账号(坐席侧登录)';

DROP TABLE IF EXISTS `id_project`;
CREATE TABLE `id_project` (
  `id`               bigint      NOT NULL COMMENT '主键(雪花ID)',
  `name`             varchar(64) NOT NULL COMMENT '项目名称',
  `app_id`           varchar(32) NOT NULL COMMENT '对外接入标识 appId',
  `app_secret`       varchar(64) DEFAULT NULL COMMENT 'SDK 密钥',
  `owner_account_id` bigint      NOT NULL COMMENT '所有者(负责人)账号id',
  `site`             varchar(16) DEFAULT 'cn' COMMENT '站点 cn中国站/intl国际站',
  `is_private`       tinyint     NOT NULL DEFAULT 0 COMMENT '是否专有云(私有化)',
  `status`           tinyint     NOT NULL DEFAULT 1 COMMENT '状态 1正常 0停用',
  `create_by`        bigint      DEFAULT NULL COMMENT '创建者',
  `create_time`      datetime    DEFAULT NULL COMMENT '创建时间',
  `update_by`        bigint      DEFAULT NULL COMMENT '更新者',
  `update_time`      datetime    DEFAULT NULL COMMENT '更新时间',
  `del_flag`         tinyint     NOT NULL DEFAULT 0 COMMENT '删除标志 0存在 1删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_app_id` (`app_id`),
  KEY `idx_owner` (`owner_account_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='项目(租户)';

-- 角色(项目内 RBAC; 权限=页面权限+功能权限; 预置 负责人/管理员/普通用户)
DROP TABLE IF EXISTS `id_role`;
CREATE TABLE `id_role` (
  `id`          bigint      NOT NULL COMMENT '主键(雪花ID)',
  `project_id`  bigint      NOT NULL COMMENT '项目id',
  `name`        varchar(32) NOT NULL COMMENT '角色名称',
  `is_system`   tinyint     NOT NULL DEFAULT 0 COMMENT '是否预置(名/权限不可改) 1是',
  `permissions` json        DEFAULT NULL COMMENT '权限 {"pages":[...],"functions":[...]} 含收件箱视图(all/unassigned)等',
  `create_by`   bigint      DEFAULT NULL COMMENT '创建者',
  `create_time` datetime    DEFAULT NULL COMMENT '创建时间',
  `update_by`   bigint      DEFAULT NULL COMMENT '更新者',
  `update_time` datetime    DEFAULT NULL COMMENT '更新时间',
  `del_flag`    tinyint     NOT NULL DEFAULT 0 COMMENT '删除标志 0存在 1删除',
  PRIMARY KEY (`id`),
  KEY `idx_project` (`project_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='角色';

DROP TABLE IF EXISTS `id_member`;
CREATE TABLE `id_member` (
  `id`            bigint      NOT NULL COMMENT '主键(雪花ID)',
  `project_id`    bigint      NOT NULL COMMENT '项目id',
  `account_id`    bigint      NOT NULL COMMENT '账号id',
  `role_id`       bigint      NOT NULL COMMENT '角色id',
  `nickname`      varchar(64) DEFAULT NULL COMMENT '成员昵称(单一真相)',
  `avatar`        varchar(256) DEFAULT NULL COMMENT '头像',
  `status`        tinyint     NOT NULL DEFAULT 1 COMMENT '状态 1启用 0禁用',
  `online_status` tinyint     NOT NULL DEFAULT 0 COMMENT '在线状态 1在线 0离线',
  `work_status`   tinyint     NOT NULL DEFAULT 0 COMMENT '工作状态(参与分配前提) 1可接 0离开',
  `language`      varchar(16) DEFAULT 'zh_CN' COMMENT '个人系统语言(简中/英文)',
  `sound_enabled` tinyint     NOT NULL DEFAULT 1 COMMENT '消息音效 1开 0关',
  `push_enabled`  tinyint     NOT NULL DEFAULT 1 COMMENT '系统推送(web/app) 1开 0关',
  `create_by`     bigint      DEFAULT NULL COMMENT '创建者',
  `create_time`   datetime    DEFAULT NULL COMMENT '创建时间',
  `update_by`     bigint      DEFAULT NULL COMMENT '更新者',
  `update_time`   datetime    DEFAULT NULL COMMENT '更新时间',
  `del_flag`      tinyint     NOT NULL DEFAULT 0 COMMENT '删除标志 0存在 1删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_project_account` (`project_id`,`account_id`),
  KEY `idx_project` (`project_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='成员(坐席)';

-- 邮箱邀请(一邮箱一条)
DROP TABLE IF EXISTS `id_invite`;
CREATE TABLE `id_invite` (
  `id`                bigint       NOT NULL COMMENT '主键(雪花ID)',
  `project_id`        bigint       NOT NULL COMMENT '项目id',
  `email`             varchar(128) NOT NULL COMMENT '被邀请邮箱',
  `token`             varchar(64)  NOT NULL COMMENT '邀请token',
  `role_id`           bigint       NOT NULL COMMENT '赋予角色id',
  `status`            tinyint      NOT NULL DEFAULT 0 COMMENT '状态 0待接受 1已接受 2已撤销 3已过期',
  `inviter_member_id` bigint       DEFAULT NULL COMMENT '邀请人成员id',
  `expire_time`       datetime     DEFAULT NULL COMMENT '过期时间(72h)',
  `create_by`         bigint       DEFAULT NULL COMMENT '创建者',
  `create_time`       datetime     DEFAULT NULL COMMENT '创建时间',
  `update_by`         bigint       DEFAULT NULL COMMENT '更新者',
  `update_time`       datetime     DEFAULT NULL COMMENT '更新时间',
  `del_flag`          tinyint      NOT NULL DEFAULT 0 COMMENT '删除标志 0存在 1删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_token` (`token`),
  KEY `idx_project` (`project_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='邮箱邀请';

-- 链接邀请(可复用,多人通过同一链接加入)
DROP TABLE IF EXISTS `id_invite_link`;
CREATE TABLE `id_invite_link` (
  `id`                bigint      NOT NULL COMMENT '主键(雪花ID)',
  `project_id`        bigint      NOT NULL COMMENT '项目id',
  `token`             varchar(64) NOT NULL COMMENT '链接token',
  `role_id`           bigint      NOT NULL COMMENT '赋予角色id',
  `join_count`        int         NOT NULL DEFAULT 0 COMMENT '通过该链接加入的人数',
  `disabled`          tinyint     NOT NULL DEFAULT 0 COMMENT '是否禁用 1是',
  `inviter_member_id` bigint      DEFAULT NULL COMMENT '创建人成员id',
  `expire_time`       datetime    DEFAULT NULL COMMENT '过期时间(72h)',
  `create_by`         bigint      DEFAULT NULL COMMENT '创建者',
  `create_time`       datetime    DEFAULT NULL COMMENT '创建时间',
  `update_by`         bigint      DEFAULT NULL COMMENT '更新者',
  `update_time`       datetime    DEFAULT NULL COMMENT '更新时间',
  `del_flag`          tinyint     NOT NULL DEFAULT 0 COMMENT '删除标志 0存在 1删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_token` (`token`),
  KEY `idx_project` (`project_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='链接邀请';

-- ========================================================================
-- mse_ 信使
-- ========================================================================

-- 信使配置(项目级 1:1; 非多语言的配置项)
DROP TABLE IF EXISTS `mse_messenger`;
CREATE TABLE `mse_messenger` (
  `id`                    bigint       NOT NULL COMMENT '主键(雪花ID)',
  `project_id`            bigint       NOT NULL COMMENT '项目id',
  `brand_name`            varchar(64)  DEFAULT NULL COMMENT '品牌名(信使端显示)',
  `logo`                  varchar(256) DEFAULT NULL COMMENT 'LOGO',
  `custom_domain`         varchar(128) DEFAULT NULL COMMENT '自定义域名',
  `badge`                 varchar(256) DEFAULT NULL COMMENT '信使角标',
  `web_title`             varchar(64)  DEFAULT NULL COMMENT '网站标题(URL接入,浏览器标签页)',
  `web_icon`              varchar(256) DEFAULT NULL COMMENT '网站图标 favicon(ico,URL接入)',
  `launcher_config`       json         DEFAULT NULL COMMENT '启动器/角标样式(圆形按钮|侧边栏 + PC/移动端 图标/位置/大小/边距等)',
  `default_language`      varchar(16)  DEFAULT 'zh_CN' COMMENT '默认语言',
  `enabled_languages`     json         DEFAULT NULL COMMENT '启用语种(默认含zh_CN,en_US)',
  `reply_time`            varchar(32)  DEFAULT NULL COMMENT '团队回复时间预期',
  `message_retention_days` int         NOT NULL DEFAULT 0 COMMENT '信使端消息保存天数 0无限',
  `popup_enabled`         tinyint      NOT NULL DEFAULT 1 COMMENT '弹窗提醒 1开 0关(红点/声效恒开)',
  `popup_allow_close`     tinyint      NOT NULL DEFAULT 1 COMMENT '是否允许客户关闭弹窗 1是',
  `create_by`             bigint       DEFAULT NULL COMMENT '创建者',
  `create_time`           datetime     DEFAULT NULL COMMENT '创建时间',
  `update_by`             bigint       DEFAULT NULL COMMENT '更新者',
  `update_time`           datetime     DEFAULT NULL COMMENT '更新时间',
  `del_flag`              tinyint      NOT NULL DEFAULT 0 COMMENT '删除标志 0存在 1删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_project` (`project_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='信使配置';

-- 信使多语言内容(问候语/团队介绍/紧急通知 按语言)
DROP TABLE IF EXISTS `mse_messenger_i18n`;
CREATE TABLE `mse_messenger_i18n` (
  `id`             bigint       NOT NULL COMMENT '主键(雪花ID)',
  `project_id`     bigint       NOT NULL COMMENT '项目id',
  `language`       varchar(16)  NOT NULL COMMENT '语言',
  `greeting`       varchar(512) DEFAULT NULL COMMENT '问候语',
  `team_intro`     varchar(512) DEFAULT NULL COMMENT '团队介绍',
  `urgent_notice`  varchar(512) DEFAULT NULL COMMENT '紧急通知内容',
  `urgent_enabled` tinyint      NOT NULL DEFAULT 0 COMMENT '紧急通知是否开启',
  `create_by`      bigint       DEFAULT NULL COMMENT '创建者',
  `create_time`    datetime     DEFAULT NULL COMMENT '创建时间',
  `update_by`      bigint       DEFAULT NULL COMMENT '更新者',
  `update_time`    datetime     DEFAULT NULL COMMENT '更新时间',
  `del_flag`       tinyint      NOT NULL DEFAULT 0 COMMENT '删除标志 0存在 1删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_project_lang` (`project_id`,`language`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='信使多语言内容';

-- ========================================================================
-- asn_ 客服组与分配(会话设置)
-- ========================================================================

DROP TABLE IF EXISTS `asn_config`;
CREATE TABLE `asn_config` (
  `id`                     bigint   NOT NULL COMMENT '主键(雪花ID)',
  `project_id`             bigint   NOT NULL COMMENT '项目id',
  `mode`                   tinyint  NOT NULL DEFAULT 2 COMMENT '分配模式 1手动 2轮流 3负载(默认轮流)',
  `capacity_limit`         int      NOT NULL DEFAULT 0 COMMENT '每坐席最大并发进行中会话数 0不限',
  `auto_close_idle_minutes` int     NOT NULL DEFAULT 0 COMMENT '会话保持期(分钟),超时自动结束 0不自动',
  `create_by`              bigint   DEFAULT NULL COMMENT '创建者',
  `create_time`            datetime DEFAULT NULL COMMENT '创建时间',
  `update_by`              bigint   DEFAULT NULL COMMENT '更新者',
  `update_time`            datetime DEFAULT NULL COMMENT '更新时间',
  `del_flag`               tinyint  NOT NULL DEFAULT 0 COMMENT '删除标志 0存在 1删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_project` (`project_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='会话设置(分配规则/限制/保持期)';

DROP TABLE IF EXISTS `asn_group`;
CREATE TABLE `asn_group` (
  `id`          bigint       NOT NULL COMMENT '主键(雪花ID)',
  `project_id`  bigint       NOT NULL COMMENT '项目id',
  `type`        tinyint      NOT NULL DEFAULT 1 COMMENT '类型 1普通(共享队列) 2专属',
  `name`        varchar(64)  NOT NULL COMMENT '组名称',
  `group_key`   varchar(32)  DEFAULT NULL COMMENT '组接入标识(URL 的 groupId; 专属组才有,普通组为空)',
  `remark`      varchar(255) DEFAULT NULL COMMENT '备注',
  `create_by`   bigint       DEFAULT NULL COMMENT '创建者',
  `create_time` datetime     DEFAULT NULL COMMENT '创建时间',
  `update_by`   bigint       DEFAULT NULL COMMENT '更新者',
  `update_time` datetime     DEFAULT NULL COMMENT '更新时间',
  `del_flag`    tinyint      NOT NULL DEFAULT 0 COMMENT '删除标志 0存在 1删除',
  PRIMARY KEY (`id`),
  KEY `idx_project` (`project_id`),
  KEY `idx_group_key` (`group_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='客服组';

-- 组成员(普通组=参与自动分配的队友; 专属组=该组队友)
DROP TABLE IF EXISTS `asn_group_member`;
CREATE TABLE `asn_group_member` (
  `id`          bigint   NOT NULL COMMENT '主键(雪花ID)',
  `project_id`  bigint   NOT NULL COMMENT '项目id',
  `group_id`    bigint   NOT NULL COMMENT '客服组id',
  `member_id`   bigint   NOT NULL COMMENT '成员id',
  `create_by`   bigint   DEFAULT NULL COMMENT '创建者',
  `create_time` datetime DEFAULT NULL COMMENT '创建时间',
  `update_by`   bigint   DEFAULT NULL COMMENT '更新者',
  `update_time` datetime DEFAULT NULL COMMENT '更新时间',
  `del_flag`    tinyint  NOT NULL DEFAULT 0 COMMENT '删除标志 0存在 1删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_group_member` (`group_id`,`member_id`),
  KEY `idx_project` (`project_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='客服组成员';

-- ========================================================================
-- cus_ 客户
-- ========================================================================

DROP TABLE IF EXISTS `cus_customer`;
CREATE TABLE `cus_customer` (
  `id`               bigint       NOT NULL COMMENT '主键(雪花ID)',
  `project_id`       bigint       NOT NULL COMMENT '项目id',
  `external_user_id` varchar(128) DEFAULT NULL COMMENT '业务UID(用户态,跨设备聚合;复杂无序)',
  `visitor_id`       varchar(64)  DEFAULT NULL COMMENT '游客设备/缓存标识(匿名态,专属会话模式)',
  `name`             varchar(64)  DEFAULT NULL COMMENT '名称(系统随机生成)',
  `avatar`           varchar(256) DEFAULT NULL COMMENT '头像(系统随机生成)',
  `type`             tinyint      DEFAULT NULL COMMENT '类型 1游客 2用户',
  `source_language`  varchar(16)  DEFAULT NULL COMMENT '客户源语言(翻译用)',
  `contact`          varchar(128) DEFAULT NULL COMMENT '联系方式(会话资料展示)',
  `email`            varchar(128) DEFAULT NULL COMMENT '邮箱',
  `custom_attrs`     json         DEFAULT NULL COMMENT '自定义属性(钱包地址/链/交易号等Web3字段)',
  `create_by`        bigint       DEFAULT NULL COMMENT '创建者',
  `create_time`      datetime     DEFAULT NULL COMMENT '创建时间',
  `update_by`        bigint       DEFAULT NULL COMMENT '更新者',
  `update_time`      datetime     DEFAULT NULL COMMENT '更新时间',
  `del_flag`         tinyint      NOT NULL DEFAULT 0 COMMENT '删除标志 0存在 1删除',
  PRIMARY KEY (`id`),
  KEY `idx_proj_ext` (`project_id`,`external_user_id`),
  KEY `idx_proj_visitor` (`project_id`,`visitor_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='客户';

-- ========================================================================
-- cnv_ 会话
-- ========================================================================

DROP TABLE IF EXISTS `cnv_conversation`;
CREATE TABLE `cnv_conversation` (
  `id`                   bigint       NOT NULL COMMENT '主键(雪花ID)',
  `project_id`           bigint       NOT NULL COMMENT '项目id',
  `customer_id`          bigint       NOT NULL COMMENT '客户id',
  `group_id`             bigint       DEFAULT NULL COMMENT '客服组id',
  `assignee_member_id`   bigint       DEFAULT NULL COMMENT '负责人成员id(空=未分配)',
  `status`               tinyint      NOT NULL DEFAULT 1 COMMENT '状态 0等待队列 1进行中 2已结束',
  `source`               varchar(16)  DEFAULT NULL COMMENT '来源 pc/app',
  `device_info`          varchar(255) DEFAULT NULL COMMENT '设备/来源信息(URL+浏览器+系统 或 APP+机型)',
  `ip`                   varchar(64)  DEFAULT NULL COMMENT '客户IP(会话资料展示)',
  `location`             varchar(64)  DEFAULT NULL COMMENT '客户所在地(会话资料展示)',
  `auto_translate`       tinyint      NOT NULL DEFAULT 0 COMMENT '该会话是否开启自动翻译',
  `unread_count`         int          NOT NULL DEFAULT 0 COMMENT '坐席侧未读数',
  `last_seq`             bigint       NOT NULL DEFAULT 0 COMMENT '会话内已分配最大消息序号',
  `last_message_preview` varchar(255) DEFAULT NULL COMMENT '最后一条消息预览',
  `last_message_at`      datetime     DEFAULT NULL COMMENT '最后消息时间',
  `closed_at`            datetime     DEFAULT NULL COMMENT '结束时间',
  `create_by`            bigint       DEFAULT NULL COMMENT '创建者',
  `create_time`          datetime     DEFAULT NULL COMMENT '创建时间',
  `update_by`            bigint       DEFAULT NULL COMMENT '更新者',
  `update_time`          datetime     DEFAULT NULL COMMENT '更新时间',
  `del_flag`             tinyint      NOT NULL DEFAULT 0 COMMENT '删除标志 0存在 1删除',
  PRIMARY KEY (`id`),
  KEY `idx_proj_status` (`project_id`,`status`),
  KEY `idx_proj_assignee` (`project_id`,`assignee_member_id`),
  KEY `idx_customer` (`customer_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='会话';

DROP TABLE IF EXISTS `cnv_assign_log`;
CREATE TABLE `cnv_assign_log` (
  `id`                 bigint   NOT NULL COMMENT '主键(雪花ID)',
  `project_id`         bigint   NOT NULL COMMENT '项目id',
  `conversation_id`    bigint   NOT NULL COMMENT '会话id',
  `from_member_id`     bigint   DEFAULT NULL COMMENT '原负责人(可空)',
  `to_member_id`       bigint   DEFAULT NULL COMMENT '新负责人',
  `type`               tinyint  NOT NULL COMMENT '类型 1自动分配 2手动认领 3转派 4禁用/删除转派',
  `operator_member_id` bigint   DEFAULT NULL COMMENT '操作人',
  `create_by`          bigint   DEFAULT NULL COMMENT '创建者',
  `create_time`        datetime DEFAULT NULL COMMENT '创建时间',
  `update_by`          bigint   DEFAULT NULL COMMENT '更新者',
  `update_time`        datetime DEFAULT NULL COMMENT '更新时间',
  `del_flag`           tinyint  NOT NULL DEFAULT 0 COMMENT '删除标志 0存在 1删除',
  PRIMARY KEY (`id`),
  KEY `idx_conversation` (`conversation_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='会话分配/转派记录';
-- 注: 内部备注/@提及 不单独建表,作为 Mongo 消息(internal=true + mentions[])处理。

-- ========================================================================
-- sup_ 辅助(快捷回复 / 黑名单)
-- ========================================================================

-- 快捷回复分类(可管理: 添加分类/未分类/售前场景/售后场景...)
DROP TABLE IF EXISTS `sup_quick_reply_category`;
CREATE TABLE `sup_quick_reply_category` (
  `id`          bigint      NOT NULL COMMENT '主键(雪花ID)',
  `project_id`  bigint      NOT NULL COMMENT '项目id',
  `name`        varchar(64) NOT NULL COMMENT '分类名称',
  `sort`        int         NOT NULL DEFAULT 0 COMMENT '排序',
  `create_by`   bigint      DEFAULT NULL COMMENT '创建者',
  `create_time` datetime    DEFAULT NULL COMMENT '创建时间',
  `update_by`   bigint      DEFAULT NULL COMMENT '更新者',
  `update_time` datetime    DEFAULT NULL COMMENT '更新时间',
  `del_flag`    tinyint     NOT NULL DEFAULT 0 COMMENT '删除标志 0存在 1删除',
  PRIMARY KEY (`id`),
  KEY `idx_project` (`project_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='快捷回复分类';

DROP TABLE IF EXISTS `sup_quick_reply`;
CREATE TABLE `sup_quick_reply` (
  `id`              bigint       NOT NULL COMMENT '主键(雪花ID)',
  `project_id`      bigint       NOT NULL COMMENT '项目id',
  `scope`           tinyint      NOT NULL DEFAULT 1 COMMENT '范围 1项目共享 2个人',
  `owner_member_id` bigint       DEFAULT NULL COMMENT '个人时所属成员id',
  `category_id`     bigint       DEFAULT NULL COMMENT '分类id(sup_quick_reply_category;空=未分类)',
  `sort`            int          NOT NULL DEFAULT 0 COMMENT '排序',
  `title`           varchar(128) DEFAULT NULL COMMENT '话术简称',
  `content`         varchar(2000) NOT NULL COMMENT '话术内容',
  `language`        varchar(16)  DEFAULT NULL COMMENT '语言',
  `create_by`       bigint       DEFAULT NULL COMMENT '创建者',
  `create_time`     datetime     DEFAULT NULL COMMENT '创建时间',
  `update_by`       bigint       DEFAULT NULL COMMENT '更新者',
  `update_time`     datetime     DEFAULT NULL COMMENT '更新时间',
  `del_flag`        tinyint      NOT NULL DEFAULT 0 COMMENT '删除标志 0存在 1删除',
  PRIMARY KEY (`id`),
  KEY `idx_project` (`project_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='快捷回复';

DROP TABLE IF EXISTS `sup_blacklist`;
CREATE TABLE `sup_blacklist` (
  `id`           bigint       NOT NULL COMMENT '主键(雪花ID)',
  `project_id`   bigint       NOT NULL COMMENT '项目id',
  `target_type`  tinyint      NOT NULL COMMENT '拉黑对象 1用户(业务UID,全设备生效) 2设备(游客)',
  `target_value` varchar(128) NOT NULL COMMENT '值: external_user_id 或 visitor_id',
  `reason`       varchar(255) DEFAULT NULL COMMENT '原因',
  `create_by`    bigint       DEFAULT NULL COMMENT '创建者',
  `create_time`  datetime     DEFAULT NULL COMMENT '创建时间',
  `update_by`    bigint       DEFAULT NULL COMMENT '更新者',
  `update_time`  datetime     DEFAULT NULL COMMENT '更新时间',
  `del_flag`     tinyint      NOT NULL DEFAULT 0 COMMENT '删除标志 0存在 1删除',
  PRIMARY KEY (`id`),
  KEY `idx_proj_target` (`project_id`,`target_type`,`target_value`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='黑名单';

-- ========================================================================
-- pay_ 订阅计费(租户购买; 平台后管可查/管)
-- ========================================================================

DROP TABLE IF EXISTS `pay_subscription`;
CREATE TABLE `pay_subscription` (
  `id`          bigint   NOT NULL COMMENT '主键(雪花ID)',
  `project_id`  bigint   NOT NULL COMMENT '项目id',
  `plan_id`     bigint   NOT NULL COMMENT '套餐id(pf_plan)',
  `status`      tinyint  NOT NULL DEFAULT 0 COMMENT '状态 0未生效 1生效 2过期 3试用',
  `start_time`  datetime DEFAULT NULL COMMENT '开始时间(开通次日起算)',
  `expire_time` datetime DEFAULT NULL COMMENT '到期时间',
  `create_by`   bigint   DEFAULT NULL COMMENT '创建者',
  `create_time` datetime DEFAULT NULL COMMENT '创建时间',
  `update_by`   bigint   DEFAULT NULL COMMENT '更新者',
  `update_time` datetime DEFAULT NULL COMMENT '更新时间',
  `del_flag`    tinyint  NOT NULL DEFAULT 0 COMMENT '删除标志 0存在 1删除',
  PRIMARY KEY (`id`),
  KEY `idx_project` (`project_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='订阅';

-- 资源配额与用量(项目×资源类型; 套餐给基础量+加量包累加, used 部分动态算)
DROP TABLE IF EXISTS `pay_quota`;
CREATE TABLE `pay_quota` (
  `id`            bigint      NOT NULL COMMENT '主键(雪花ID)',
  `project_id`    bigint      NOT NULL COMMENT '项目id',
  `resource_type` varchar(32) NOT NULL COMMENT '资源类型 seat=席位/translate_char=翻译字符/customer=客户配额',
  `total`         bigint      NOT NULL DEFAULT 0 COMMENT '总量(套餐+加量包)',
  `used`          bigint      NOT NULL DEFAULT 0 COMMENT '已用量(动态资源可由统计覆盖)',
  `is_unlimited`  tinyint     NOT NULL DEFAULT 0 COMMENT '是否无限 1是',
  `create_by`     bigint      DEFAULT NULL COMMENT '创建者',
  `create_time`   datetime    DEFAULT NULL COMMENT '创建时间',
  `update_by`     bigint      DEFAULT NULL COMMENT '更新者',
  `update_time`   datetime    DEFAULT NULL COMMENT '更新时间',
  `del_flag`      tinyint     NOT NULL DEFAULT 0 COMMENT '删除标志 0存在 1删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_proj_res` (`project_id`,`resource_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='资源配额与用量';

-- 支付订单(数字货币在线支付, 搬 cicada/NexaPay 逻辑)
DROP TABLE IF EXISTS `pay_order`;
CREATE TABLE `pay_order` (
  `id`              bigint         NOT NULL COMMENT '主键(雪花ID)',
  `project_id`      bigint         NOT NULL COMMENT '项目id',
  `order_no`        varchar(64)    NOT NULL COMMENT '订单编号',
  `order_type`      tinyint        NOT NULL COMMENT '类型 1套餐订阅 2续费 3升级 4购席位 5购加量包',
  `subscription_id` bigint         DEFAULT NULL COMMENT '关联订阅id',
  `plan_id`         bigint         DEFAULT NULL COMMENT '套餐id(套餐类订单)',
  `addon_pack_id`   bigint         DEFAULT NULL COMMENT '加量包id(加量包订单)',
  `quantity`        int            NOT NULL DEFAULT 1 COMMENT '数量(席位数/加量包数)',
  `period_days`     int            DEFAULT NULL COMMENT '订阅周期(天)',
  `resource_desc`   varchar(255)   DEFAULT NULL COMMENT '订阅资源描述',
  `amount`          decimal(36,18) NOT NULL DEFAULT 0 COMMENT '金额',
  `currency`        varchar(16)    DEFAULT 'USD' COMMENT '计价币种',
  `coin`            varchar(32)    DEFAULT NULL COMMENT '支付币种 USDT',
  `network`         varchar(32)    DEFAULT NULL COMMENT '网络/链 TRC20/ERC20',
  `pay_address`     varchar(128)   DEFAULT NULL COMMENT '收款地址',
  `tx_hash`         varchar(128)   DEFAULT NULL COMMENT '链上交易号',
  `status`          tinyint        NOT NULL DEFAULT 0 COMMENT '状态 0待支付 1已支付/开通 2已取消 3已过期',
  `paid_time`       datetime       DEFAULT NULL COMMENT '到账时间',
  `expire_time`     datetime       DEFAULT NULL COMMENT '订单支付过期(约24h)',
  `create_by`       bigint         DEFAULT NULL COMMENT '创建者',
  `create_time`     datetime       DEFAULT NULL COMMENT '创建时间',
  `update_by`       bigint         DEFAULT NULL COMMENT '更新者',
  `update_time`     datetime       DEFAULT NULL COMMENT '更新时间',
  `del_flag`        tinyint        NOT NULL DEFAULT 0 COMMENT '删除标志 0存在 1删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_order_no` (`order_no`),
  KEY `idx_project` (`project_id`),
  KEY `idx_status` (`status`),
  KEY `idx_tx` (`tx_hash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='支付订单';

-- ============================================================
-- 消息: MongoDB 集合 messages(含 internal=true + mentions[] 表示内部消息/@提及)。
-- 结构见《领域模型与表结构.md》第六节; seq 由 Redis INCR + 落 cnv_conversation.last_seq。
-- ============================================================

SET FOREIGN_KEY_CHECKS = 1;
