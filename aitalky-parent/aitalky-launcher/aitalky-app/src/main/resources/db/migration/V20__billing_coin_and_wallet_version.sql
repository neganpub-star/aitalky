-- ============================================================
-- 订阅计费 第②期:币种/链配置(后管可配,数据驱动) + 钱包乐观锁列
-- 1) bil_wallet 加 version 列:余额并发入账用乐观锁防丢更新(配合项目锁 + txid 幂等)
-- 2) bil_coin 币种配置表:每条=一个可充值的"渠道+链+代币";加币种/链只插数据不改代码
--    chain_id/token_id 为 Coinly 侧标识,种子先占位,联调时调 Coinly /v1/coins 校正真实值。
-- ============================================================

-- 钱包加乐观锁版本列(余额并发更新防丢失)
ALTER TABLE `bil_wallet`
  ADD COLUMN `version` int NOT NULL DEFAULT 0 COMMENT '乐观锁版本(余额并发更新防丢失)' AFTER `currency`;

-- 币种/链配置(数据驱动:坐席端充值选网络、建址按 chain_id、回调按 currency/token_id 比对)
CREATE TABLE `bil_coin` (
  `id`           bigint        NOT NULL COMMENT '主键(雪花ID)',
  `channel`      varchar(32)   NOT NULL DEFAULT 'coinly' COMMENT '支付渠道',
  `symbol`       varchar(32)   NOT NULL COMMENT '币种符号(如 USDT)',
  `currency`     varchar(32)   NOT NULL COMMENT '币种全称(展示/回调比对,如 USDT-TRC20)',
  `network`      varchar(16)   NOT NULL COMMENT '网络标识(下单选网络,如 TRC20/ERC20)',
  `chain_id`     varchar(32)   NOT NULL COMMENT 'Coinly 链id(建址/回调用)',
  `chain_name`   varchar(32)   NOT NULL COMMENT '链名称(展示,如 Tron/Ethereum)',
  `token_id`     varchar(128)  DEFAULT NULL COMMENT 'Coinly 代币id(回调比对用)',
  `decimals`     int           NOT NULL DEFAULT 6 COMMENT '代币精度',
  `sort`         int           NOT NULL DEFAULT 0 COMMENT '排序(小在前)',
  `status`       tinyint       NOT NULL DEFAULT 1 COMMENT '状态 1启用 0停用',
  `create_by`    bigint        DEFAULT NULL,
  `create_time`  datetime      DEFAULT NULL,
  `update_by`    bigint        DEFAULT NULL,
  `update_time`  datetime      DEFAULT NULL,
  `del_flag`     tinyint       NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_channel_currency` (`channel`,`currency`),
  KEY `idx_status_sort` (`status`,`sort`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='币种/链配置';

-- 种子:目前只接 USDT TRC20 / ERC20。chain_id/token_id 为占位,联调时按 Coinly /v1/coins 校正。
INSERT INTO `bil_coin`
  (`id`,`channel`,`symbol`,`currency`,`network`,`chain_id`,`chain_name`,`token_id`,`decimals`,`sort`,`status`,`create_time`,`update_time`,`del_flag`)
VALUES
  (2090000000000000001,'coinly','USDT','USDT-TRC20','TRC20','tron','Tron',NULL,6,1,1,NOW(),NOW(),0),
  (2090000000000000002,'coinly','USDT','USDT-ERC20','ERC20','ethereum','Ethereum',NULL,6,2,1,NOW(),NOW(),0);
