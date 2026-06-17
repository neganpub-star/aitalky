-- ============================================================
-- 订阅计费(billing,bil_ 前缀):订阅 / 订单 / 项目余额 / 充值流水 / 收款地址
-- 产品流程对齐 ByteTrack(套餐订阅/概览/订单记录);支付用 Coinly 钱包(项目固定地址+订单金额匹配+余额兜底)。
-- 安全:地址 AES-256-GCM 加密存储;订单/余额/流水关键字段 行级 HMAC 防篡改(sign 列);txid 唯一去重防重放。
-- 金额统一 decimal(20,8);多租户 project_id 自动注入。
-- ============================================================

-- 项目订阅(每项目一条;当前生效套餐 + 到期时间)
CREATE TABLE `bil_subscription` (
  `id`           bigint        NOT NULL COMMENT '主键(雪花ID)',
  `project_id`   bigint        NOT NULL COMMENT '项目id(租户)',
  `plan_id`      bigint        NOT NULL COMMENT '套餐id',
  `plan_code`    varchar(32)   NOT NULL COMMENT '套餐编码(快照)',
  `plan_name`    varchar(64)   NOT NULL COMMENT '套餐名称(快照)',
  `status`       tinyint       NOT NULL DEFAULT 1 COMMENT '状态 1有效 0已过期',
  `start_time`   datetime      NOT NULL COMMENT '生效时间(开通次日起算)',
  `expire_time`  datetime      NOT NULL COMMENT '到期时间',
  `create_by`    bigint        DEFAULT NULL,
  `create_time`  datetime      DEFAULT NULL,
  `update_by`    bigint        DEFAULT NULL,
  `update_time`  datetime      DEFAULT NULL,
  `del_flag`     tinyint       NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_project` (`project_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='项目订阅';

-- 订单(预支付/已完成;同项目同时仅一个待支付,新单作废旧的)
CREATE TABLE `bil_order` (
  `id`           bigint        NOT NULL COMMENT '主键(雪花ID)',
  `order_no`     varchar(32)   NOT NULL COMMENT '订单编号(展示给客户)',
  `project_id`   bigint        NOT NULL COMMENT '项目id',
  `type`         varchar(16)   NOT NULL COMMENT '类型 new新购/renew续费/upgrade升级',
  `plan_id`      bigint        NOT NULL COMMENT '套餐id',
  `plan_name`    varchar(64)   NOT NULL COMMENT '套餐名称(快照)',
  `months`       int           NOT NULL COMMENT '订阅月数(30天/月)',
  `amount`       decimal(20,8) NOT NULL COMMENT '订单金额',
  `currency`     varchar(16)   NOT NULL DEFAULT 'USDT' COMMENT '币种',
  `status`       tinyint       NOT NULL DEFAULT 0 COMMENT '状态 0待支付 1已完成 2已作废',
  `paid_time`    datetime      DEFAULT NULL COMMENT '完成时间',
  `sign`         varchar(64)   DEFAULT NULL COMMENT '关键字段HMAC-SHA256(防改库)',
  `create_by`    bigint        DEFAULT NULL,
  `create_time`  datetime      DEFAULT NULL,
  `update_by`    bigint        DEFAULT NULL,
  `update_time`  datetime      DEFAULT NULL,
  `del_flag`     tinyint       NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_order_no` (`order_no`),
  KEY `idx_project_status` (`project_id`,`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='订阅订单';

-- 项目钱包余额(充值入账,买套餐扣减;余额兜底防丢钱)
CREATE TABLE `bil_wallet` (
  `id`           bigint        NOT NULL COMMENT '主键(雪花ID)',
  `project_id`   bigint        NOT NULL COMMENT '项目id',
  `balance`      decimal(20,8) NOT NULL DEFAULT 0 COMMENT '余额',
  `currency`     varchar(16)   NOT NULL DEFAULT 'USDT' COMMENT '币种',
  `version`      int           NOT NULL DEFAULT 0 COMMENT '乐观锁版本(余额并发更新防丢失)',
  `sign`         varchar(64)   DEFAULT NULL COMMENT 'project_id+balance 的 HMAC(防改库改余额)',
  `create_by`    bigint        DEFAULT NULL,
  `create_time`  datetime      DEFAULT NULL,
  `update_by`    bigint        DEFAULT NULL,
  `update_time`  datetime      DEFAULT NULL,
  `del_flag`     tinyint       NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_project` (`project_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='项目钱包余额';

-- 充值流水(Coinly 回调入账;txid 唯一防重放)
CREATE TABLE `bil_recharge` (
  `id`           bigint        NOT NULL COMMENT '主键(雪花ID)',
  `project_id`   bigint        NOT NULL COMMENT '项目id',
  `address`      varchar(128)  NOT NULL COMMENT '收款地址(明文,回调比对用)',
  `amount`       decimal(20,8) NOT NULL COMMENT '到账金额',
  `currency`     varchar(32)   DEFAULT NULL COMMENT '币种(如 USDT-ERC20)',
  `chain_id`     varchar(32)   DEFAULT NULL COMMENT '链id',
  `token_id`     varchar(128)  DEFAULT NULL COMMENT '代币id',
  `txid`         varchar(128)  NOT NULL COMMENT '交易哈希(唯一,幂等)',
  `block_height` varchar(32)   DEFAULT NULL COMMENT '区块高度',
  `sign`         varchar(64)   DEFAULT NULL COMMENT '关键字段HMAC(防改库)',
  `create_by`    bigint        DEFAULT NULL,
  `create_time`  datetime      DEFAULT NULL,
  `update_by`    bigint        DEFAULT NULL,
  `update_time`  datetime      DEFAULT NULL,
  `del_flag`     tinyint       NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_txid` (`txid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='充值流水';

-- 项目收款地址(每项目每链一个固定地址;地址 AES-256-GCM 加密存储)
CREATE TABLE `bil_address` (
  `id`           bigint        NOT NULL COMMENT '主键(雪花ID)',
  `project_id`   bigint        NOT NULL COMMENT '项目id',
  `channel`      varchar(32)   NOT NULL DEFAULT 'coinly' COMMENT '支付渠道',
  `chain_id`     varchar(32)   NOT NULL COMMENT '链id',
  `address_enc`  varchar(512)  NOT NULL COMMENT '收款地址(AES-256-GCM 密文)',
  `address_hash` varchar(64)   NOT NULL COMMENT '地址SHA-256(回调按地址反查项目用,不暴露明文)',
  `token_id`     varchar(128)  DEFAULT NULL COMMENT '代币id',
  `currency`     varchar(32)   DEFAULT NULL COMMENT '币种',
  `create_by`    bigint        DEFAULT NULL,
  `create_time`  datetime      DEFAULT NULL,
  `update_by`    bigint        DEFAULT NULL,
  `update_time`  datetime      DEFAULT NULL,
  `del_flag`     tinyint       NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_project_chain` (`project_id`,`chain_id`),
  KEY `idx_addr_hash` (`address_hash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='项目收款地址';
