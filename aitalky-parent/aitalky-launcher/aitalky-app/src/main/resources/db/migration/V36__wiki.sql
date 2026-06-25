-- Flyway V36: wiki 知识库模块(1:1 复刻 ByteTrack)
-- 站点(应用) + 多语言文案 + 文章(草稿/发布快照/多语言) + 历史记录 + 类别 + 分组 + 类别文章关联。
-- 全表带 project_id 走多租户拦截器(自动按租户过滤 + insert 注入)。
-- 对外公开站点(E)本期不做,但站点表预留 subdomain/custom_domain/favicon/theme_color/layout 等字段。

-- ============ 站点(应用) ============
CREATE TABLE `wiki_site` (
    `id`            BIGINT      NOT NULL COMMENT '主键(雪花)',
    `project_id`    BIGINT      NOT NULL COMMENT '项目ID',
    `icon`          VARCHAR(64) NULL COMMENT '应用图标(图标库key)',
    `logo`          VARCHAR(512) NULL COMMENT '应用LOGO(站点全局,非分语言)',
    `brand_short`   VARCHAR(64) NULL COMMENT '产品简称(站点全局)',
    `default_lang`  VARCHAR(16) NOT NULL DEFAULT 'zh_CN' COMMENT '默认语言',
    `multi_lang`    TINYINT     NOT NULL DEFAULT 0 COMMENT '是否多语言:0单语 1多语',
    `theme_color`   VARCHAR(16) NULL COMMENT '主题色(hex)',
    `layout`        TINYINT     NOT NULL DEFAULT 1 COMMENT '类别页布局:1列表模式 2双栏模式',
    `subdomain`     VARCHAR(64) NULL COMMENT '子域(项目内唯一,对外站点用)',
    `custom_domain` VARCHAR(128) NULL COMMENT '自定义域名(对外站点用)',
    `favicon`       VARCHAR(512) NULL COMMENT '站点 favicon',
    `enabled`       TINYINT     NOT NULL DEFAULT 0 COMMENT '站点状态:0已禁用 1已开启(新建默认禁用)',
    `is_default`    TINYINT     NOT NULL DEFAULT 0 COMMENT '是否默认应用:0自定义(可删) 1默认帮助中心(不可删)',
    `sort`          INT         NOT NULL DEFAULT 0 COMMENT '排序值',
    `create_by`     BIGINT      NULL,
    `create_time`   DATETIME    NULL,
    `update_by`     BIGINT      NULL,
    `update_time`   DATETIME    NULL,
    `del_flag`      TINYINT     NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    KEY `idx_project` (`project_id`),
    UNIQUE KEY `uk_project_subdomain` (`project_id`, `subdomain`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = 'wiki站点(应用)';

-- 站点多语言文案(应用名称/标题/描述,按语言;LOGO/产品简称在站点表全局)
CREATE TABLE `wiki_site_i18n` (
    `id`          BIGINT       NOT NULL COMMENT '主键(雪花)',
    `project_id`  BIGINT       NOT NULL COMMENT '项目ID',
    `site_id`     BIGINT       NOT NULL COMMENT '站点ID',
    `lang`        VARCHAR(16)  NOT NULL COMMENT '语言',
    `app_name`    VARCHAR(128) NULL COMMENT '应用名称(分语言)',
    `title`       VARCHAR(255) NULL COMMENT '站点首页标题(宣传文案)',
    `description` VARCHAR(512) NULL COMMENT '自定义描述文字',
    `create_by`   BIGINT       NULL,
    `create_time` DATETIME     NULL,
    `update_by`   BIGINT       NULL,
    `update_time` DATETIME     NULL,
    `del_flag`    TINYINT      NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_site_lang` (`site_id`, `lang`),
    KEY `idx_project` (`project_id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = 'wiki站点多语言文案';

-- ============ 文章 ============
CREATE TABLE `wiki_article` (
    `id`           BIGINT   NOT NULL COMMENT '主键(雪花)',
    `project_id`   BIGINT   NOT NULL COMMENT '项目ID',
    `status`       TINYINT  NOT NULL DEFAULT 1 COMMENT '发布状态:1未发布 2已发布 3有变更',
    `is_recommend` TINYINT  NOT NULL DEFAULT 0 COMMENT '是否推荐:0否 1是(信使端可见)',
    `share_code`   VARCHAR(32) NULL COMMENT '外链分享码(已发布生成)',
    `create_by`    BIGINT   NULL,
    `create_time`  DATETIME NULL,
    `update_by`    BIGINT   NULL,
    `update_time`  DATETIME NULL,
    `del_flag`     TINYINT  NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    KEY `idx_project` (`project_id`),
    UNIQUE KEY `uk_share_code` (`share_code`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = 'wiki文章';

-- 文章多语言内容(草稿 + 已发布快照,按语言)
CREATE TABLE `wiki_article_i18n` (
    `id`            BIGINT       NOT NULL COMMENT '主键(雪花)',
    `project_id`    BIGINT       NOT NULL COMMENT '项目ID',
    `article_id`    BIGINT       NOT NULL COMMENT '文章ID',
    `lang`          VARCHAR(16)  NOT NULL COMMENT '语言',
    `title`         VARCHAR(255) NULL COMMENT '文章名(草稿)',
    `summary`       VARCHAR(512) NULL COMMENT '文章描述(草稿)',
    `content`       LONGTEXT     NULL COMMENT '文章正文(草稿,Markdown/HTML)',
    `pub_title`     VARCHAR(255) NULL COMMENT '文章名(已发布快照)',
    `pub_summary`   VARCHAR(512) NULL COMMENT '文章描述(已发布快照)',
    `pub_content`   LONGTEXT     NULL COMMENT '文章正文(已发布快照)',
    `published`     TINYINT      NOT NULL DEFAULT 0 COMMENT '该语言是否已发布:0否 1是',
    `create_by`     BIGINT       NULL,
    `create_time`   DATETIME     NULL,
    `update_by`     BIGINT       NULL,
    `update_time`   DATETIME     NULL,
    `del_flag`      TINYINT      NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_article_lang` (`article_id`, `lang`),
    KEY `idx_project` (`project_id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = 'wiki文章多语言内容';

-- 文章历史记录(创建/编辑/发布/取消发布,存内容快照供预览)
CREATE TABLE `wiki_article_history` (
    `id`          BIGINT      NOT NULL COMMENT '主键(雪花)',
    `project_id`  BIGINT      NOT NULL COMMENT '项目ID',
    `article_id`  BIGINT      NOT NULL COMMENT '文章ID',
    `action`      TINYINT     NOT NULL COMMENT '行为:1创建 2编辑 3发布 4取消发布',
    `snapshot`    LONGTEXT    NULL COMMENT '内容快照(JSON,各语言 title/summary/content)',
    `operator_id` BIGINT      NULL COMMENT '操作人成员ID',
    `create_by`   BIGINT      NULL,
    `create_time` DATETIME    NULL,
    `update_by`   BIGINT      NULL,
    `update_time` DATETIME    NULL,
    `del_flag`    TINYINT     NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    KEY `idx_project` (`project_id`),
    KEY `idx_article` (`article_id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = 'wiki文章历史记录';

-- ============ 类别 / 分组 ============
CREATE TABLE `wiki_category` (
    `id`          BIGINT   NOT NULL COMMENT '主键(雪花)',
    `project_id`  BIGINT   NOT NULL COMMENT '项目ID',
    `site_id`     BIGINT   NOT NULL COMMENT '所属站点ID',
    `icon`        VARCHAR(64) NULL COMMENT '类别图标(图标库key)',
    `sort`        INT      NOT NULL DEFAULT 0 COMMENT '排序值',
    `create_by`   BIGINT   NULL,
    `create_time` DATETIME NULL,
    `update_by`   BIGINT   NULL,
    `update_time` DATETIME NULL,
    `del_flag`    TINYINT  NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    KEY `idx_project` (`project_id`),
    KEY `idx_site` (`site_id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = 'wiki类别';

CREATE TABLE `wiki_category_i18n` (
    `id`          BIGINT       NOT NULL COMMENT '主键(雪花)',
    `project_id`  BIGINT       NOT NULL COMMENT '项目ID',
    `category_id` BIGINT       NOT NULL COMMENT '类别ID',
    `lang`        VARCHAR(16)  NOT NULL COMMENT '语言',
    `name`        VARCHAR(128) NULL COMMENT '类别名(分语言)',
    `description` VARCHAR(512) NULL COMMENT '类别描述(分语言)',
    `create_by`   BIGINT       NULL,
    `create_time` DATETIME     NULL,
    `update_by`   BIGINT       NULL,
    `update_time` DATETIME     NULL,
    `del_flag`    TINYINT      NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_category_lang` (`category_id`, `lang`),
    KEY `idx_project` (`project_id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = 'wiki类别多语言名';

CREATE TABLE `wiki_group` (
    `id`          BIGINT   NOT NULL COMMENT '主键(雪花)',
    `project_id`  BIGINT   NOT NULL COMMENT '项目ID',
    `category_id` BIGINT   NOT NULL COMMENT '所属类别ID',
    `sort`        INT      NOT NULL DEFAULT 0 COMMENT '排序值',
    `create_by`   BIGINT   NULL,
    `create_time` DATETIME NULL,
    `update_by`   BIGINT   NULL,
    `update_time` DATETIME NULL,
    `del_flag`    TINYINT  NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    KEY `idx_project` (`project_id`),
    KEY `idx_category` (`category_id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = 'wiki分组(类别下)';

CREATE TABLE `wiki_group_i18n` (
    `id`          BIGINT       NOT NULL COMMENT '主键(雪花)',
    `project_id`  BIGINT       NOT NULL COMMENT '项目ID',
    `group_id`    BIGINT       NOT NULL COMMENT '分组ID',
    `lang`        VARCHAR(16)  NOT NULL COMMENT '语言',
    `name`        VARCHAR(128) NULL COMMENT '分组名(分语言)',
    `create_by`   BIGINT       NULL,
    `create_time` DATETIME     NULL,
    `update_by`   BIGINT       NULL,
    `update_time` DATETIME     NULL,
    `del_flag`    TINYINT      NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_group_lang` (`group_id`, `lang`),
    KEY `idx_project` (`project_id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = 'wiki分组多语言名';

-- 类别(分组)-文章关联。文章可直接挂类别(group_id=0)或挂分组。
-- 注意:join 表 uk 不含 del_flag,逻辑删后重加同行会撞唯一键,故走物理删除。
CREATE TABLE `wiki_category_article` (
    `id`          BIGINT   NOT NULL COMMENT '主键(雪花)',
    `project_id`  BIGINT   NOT NULL COMMENT '项目ID',
    `category_id` BIGINT   NOT NULL COMMENT '类别ID',
    `group_id`    BIGINT   NOT NULL DEFAULT 0 COMMENT '分组ID(0=直接挂类别)',
    `article_id`  BIGINT   NOT NULL COMMENT '文章ID',
    `sort`        INT      NOT NULL DEFAULT 0 COMMENT '排序值',
    `create_by`   BIGINT   NULL,
    `create_time` DATETIME NULL,
    `update_by`   BIGINT   NULL,
    `update_time` DATETIME NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_category_article` (`category_id`, `article_id`),
    KEY `idx_project` (`project_id`),
    KEY `idx_article` (`article_id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = 'wiki类别-文章关联(物理删除)';
