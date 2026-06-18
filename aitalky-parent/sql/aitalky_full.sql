-- MySQL dump 10.13  Distrib 8.0.28, for macos11 (arm64)
--
-- Host: localhost    Database: aitalky
-- ------------------------------------------------------
-- Server version	8.0.28

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `asn_config`
--

DROP TABLE IF EXISTS `asn_config`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `asn_config` (
  `id` bigint NOT NULL COMMENT '主键(雪花ID)',
  `project_id` bigint NOT NULL COMMENT '项目id',
  `mode` tinyint NOT NULL DEFAULT '2' COMMENT '分配模式 1手动 2轮流 3负载(默认轮流)',
  `capacity_limit` int NOT NULL DEFAULT '0' COMMENT '每坐席最大并发进行中会话数 0不限',
  `round_robin_cursor` bigint DEFAULT NULL COMMENT '轮流分配游标:上次分到的 member_id',
  `auto_close_idle_minutes` int NOT NULL DEFAULT '0' COMMENT '会话保持期(分钟),超时自动结束 0不自动',
  `create_by` bigint DEFAULT NULL COMMENT '创建者',
  `create_time` datetime DEFAULT NULL COMMENT '创建时间',
  `update_by` bigint DEFAULT NULL COMMENT '更新者',
  `update_time` datetime DEFAULT NULL COMMENT '更新时间',
  `del_flag` tinyint NOT NULL DEFAULT '0' COMMENT '删除标志 0存在 1删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_project` (`project_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='会话设置(分配规则/限制/保持期)';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `asn_config`
--

LOCK TABLES `asn_config` WRITE;
/*!40000 ALTER TABLE `asn_config` DISABLE KEYS */;
INSERT INTO `asn_config` VALUES (324815374044364800,322576880446210048,2,0,322576880534290432,120,322576880534290432,'2026-06-15 15:40:20',322576880534290432,'2026-06-15 15:40:20',0);
/*!40000 ALTER TABLE `asn_config` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `asn_group`
--

DROP TABLE IF EXISTS `asn_group`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `asn_group` (
  `id` bigint NOT NULL COMMENT '主键(雪花ID)',
  `project_id` bigint NOT NULL COMMENT '项目id',
  `type` tinyint NOT NULL DEFAULT '1' COMMENT '类型 1普通(共享队列) 2专属',
  `name` varchar(64) COLLATE utf8mb4_general_ci NOT NULL COMMENT '组名称',
  `group_key` varchar(32) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '组接入标识(URL 的 groupId; 专属组才有,普通组为空)',
  `remark` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '备注',
  `create_by` bigint DEFAULT NULL COMMENT '创建者',
  `create_time` datetime DEFAULT NULL COMMENT '创建时间',
  `update_by` bigint DEFAULT NULL COMMENT '更新者',
  `update_time` datetime DEFAULT NULL COMMENT '更新时间',
  `del_flag` tinyint NOT NULL DEFAULT '0' COMMENT '删除标志 0存在 1删除',
  PRIMARY KEY (`id`),
  KEY `idx_project` (`project_id`),
  KEY `idx_group_key` (`group_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='客服组';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `asn_group`
--

LOCK TABLES `asn_group` WRITE;
/*!40000 ALTER TABLE `asn_group` DISABLE KEYS */;
INSERT INTO `asn_group` VALUES (324816775118061568,322576880446210048,1,'普通分配',NULL,NULL,324736000578289664,'2026-06-15 15:45:54',324736000578289664,'2026-06-15 15:45:54',0),(324852429583548416,322576880446210048,2,'我的群组','Ku2enkiGgf','test',324736000578289664,'2026-06-15 18:07:35',324736000578289664,'2026-06-15 18:07:35',0);
/*!40000 ALTER TABLE `asn_group` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `asn_group_member`
--

DROP TABLE IF EXISTS `asn_group_member`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `asn_group_member` (
  `id` bigint NOT NULL COMMENT '主键(雪花ID)',
  `project_id` bigint NOT NULL COMMENT '项目id',
  `group_id` bigint NOT NULL COMMENT '客服组id',
  `member_id` bigint NOT NULL COMMENT '成员id',
  `create_by` bigint DEFAULT NULL COMMENT '创建者',
  `create_time` datetime DEFAULT NULL COMMENT '创建时间',
  `update_by` bigint DEFAULT NULL COMMENT '更新者',
  `update_time` datetime DEFAULT NULL COMMENT '更新时间',
  `del_flag` tinyint NOT NULL DEFAULT '0' COMMENT '删除标志 0存在 1删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_group_member` (`group_id`,`member_id`),
  KEY `idx_project` (`project_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='客服组成员';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `asn_group_member`
--

LOCK TABLES `asn_group_member` WRITE;
/*!40000 ALTER TABLE `asn_group_member` DISABLE KEYS */;
INSERT INTO `asn_group_member` VALUES (324816775189364736,322576880446210048,324816775118061568,322576880534290432,324736000578289664,'2026-06-15 15:45:54',324736000578289664,'2026-06-15 15:45:54',0),(324847468623691776,322576880446210048,324816775118061568,324736000578289664,322576880534290432,'2026-06-15 17:47:52',322576880534290432,'2026-06-15 17:47:52',0),(324852429608714240,322576880446210048,324852429583548416,324736000578289664,324736000578289664,'2026-06-15 18:07:35',324736000578289664,'2026-06-15 18:07:35',0),(324852429621297152,322576880446210048,324852429583548416,322576880534290432,324736000578289664,'2026-06-15 18:07:35',324736000578289664,'2026-06-15 18:07:35',0);
/*!40000 ALTER TABLE `asn_group_member` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bil_address`
--

DROP TABLE IF EXISTS `bil_address`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bil_address` (
  `id` bigint NOT NULL COMMENT '主键(雪花ID)',
  `project_id` bigint NOT NULL COMMENT '项目id',
  `channel` varchar(32) COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'coinly' COMMENT '支付渠道',
  `chain_id` varchar(32) COLLATE utf8mb4_general_ci NOT NULL COMMENT '链id',
  `address_enc` varchar(512) COLLATE utf8mb4_general_ci NOT NULL COMMENT '收款地址(AES-256-GCM 密文)',
  `address_hash` varchar(64) COLLATE utf8mb4_general_ci NOT NULL COMMENT '地址SHA-256(回调按地址反查项目用,不暴露明文)',
  `token_id` varchar(128) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '代币id',
  `currency` varchar(32) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '币种',
  `create_by` bigint DEFAULT NULL,
  `create_time` datetime DEFAULT NULL,
  `update_by` bigint DEFAULT NULL,
  `update_time` datetime DEFAULT NULL,
  `del_flag` tinyint NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_project_chain` (`project_id`,`chain_id`),
  KEY `idx_addr_hash` (`address_hash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='项目收款地址';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bil_address`
--

LOCK TABLES `bil_address` WRITE;
/*!40000 ALTER TABLE `bil_address` DISABLE KEYS */;
INSERT INTO `bil_address` VALUES (325569833993240576,322576880446210048,'coinly','195','q0ylpSS0chvHC4gleIEMTRyTbS8T3oxE9QxOzLMt8fun5uQ+n93a5R/xQIUxlUAdiWh1IfQJRFwFPl8xxt0=','0d094e8787ee7281836ca8a3891e5f43ea687c8ee1fcb7e05ed78a0d4a29fe1f','TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t','USDT-TRC20',322576880534290432,'2026-06-17 17:38:17',322576880534290432,'2026-06-17 17:38:17',0),(325573636943511552,322576880446210048,'coinly','60','1ecWMy0H9gOYdOrY4obzTxzXdSObE/s0aKMryrYsSF4ZLsVtnyyOR9DLpZx96uZdFEA+7ozJqY1RMyVVWxBgCF/nUU6LtA==','79fcee2bc572dc4d6e4536c64fbe0ceefa5a02227d06a9752ec4cbc8ffc91aab','0xdac17f958d2ee523a2206206994597c13d831ec7','USDT-ERC20',322576880534290432,'2026-06-17 17:53:24',322576880534290432,'2026-06-17 17:53:24',0);
/*!40000 ALTER TABLE `bil_address` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bil_coin`
--

DROP TABLE IF EXISTS `bil_coin`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bil_coin` (
  `id` bigint NOT NULL COMMENT '主键(雪花ID)',
  `channel` varchar(32) COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'coinly' COMMENT '支付渠道',
  `symbol` varchar(32) COLLATE utf8mb4_general_ci NOT NULL COMMENT '币种符号(如 USDT)',
  `currency` varchar(32) COLLATE utf8mb4_general_ci NOT NULL COMMENT '币种全称(展示/回调比对,如 USDT-TRC20)',
  `network` varchar(16) COLLATE utf8mb4_general_ci NOT NULL COMMENT '网络标识(下单选网络,如 TRC20/ERC20)',
  `chain_id` varchar(32) COLLATE utf8mb4_general_ci NOT NULL COMMENT 'Coinly 链id(建址/回调用)',
  `chain_name` varchar(32) COLLATE utf8mb4_general_ci NOT NULL COMMENT '链名称(展示,如 Tron/Ethereum)',
  `token_id` varchar(128) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'Coinly 代币id(回调比对用)',
  `decimals` int NOT NULL DEFAULT '6' COMMENT '代币精度',
  `sort` int NOT NULL DEFAULT '0' COMMENT '排序(小在前)',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '状态 1启用 0停用',
  `create_by` bigint DEFAULT NULL,
  `create_time` datetime DEFAULT NULL,
  `update_by` bigint DEFAULT NULL,
  `update_time` datetime DEFAULT NULL,
  `del_flag` tinyint NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_channel_currency` (`channel`,`currency`),
  KEY `idx_status_sort` (`status`,`sort`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='币种/链配置';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bil_coin`
--

LOCK TABLES `bil_coin` WRITE;
/*!40000 ALTER TABLE `bil_coin` DISABLE KEYS */;
INSERT INTO `bil_coin` VALUES (2090000000000000001,'coinly','USDT','USDT-TRC20','TRC20','195','Tron','TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',6,1,1,NULL,'2026-06-17 11:54:06',NULL,'2026-06-17 11:54:06',0),(2090000000000000002,'coinly','USDT','USDT-ERC20','ERC20','60','Ethereum','0xdac17f958d2ee523a2206206994597c13d831ec7',6,2,1,NULL,'2026-06-17 11:54:06',NULL,'2026-06-17 11:54:06',0);
/*!40000 ALTER TABLE `bil_coin` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bil_order`
--

DROP TABLE IF EXISTS `bil_order`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bil_order` (
  `id` bigint NOT NULL COMMENT '主键(雪花ID)',
  `order_no` varchar(32) COLLATE utf8mb4_general_ci NOT NULL COMMENT '订单编号(展示给客户)',
  `project_id` bigint NOT NULL COMMENT '项目id',
  `type` varchar(16) COLLATE utf8mb4_general_ci NOT NULL COMMENT '类型 new新购/renew续费/upgrade升级',
  `resource_type` varchar(32) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '加购资源类型 seat/customer;套餐单为空',
  `plan_id` bigint NOT NULL COMMENT '套餐id',
  `plan_name` varchar(64) COLLATE utf8mb4_general_ci NOT NULL COMMENT '套餐名称(快照)',
  `months` int NOT NULL COMMENT '订阅月数(30天/月)',
  `seats` int NOT NULL DEFAULT '0' COMMENT '加购席位数(套餐配额之外)',
  `quantity` int NOT NULL DEFAULT '0' COMMENT '客户配额加购:新增配额总数(套餐/席位单为0)',
  `addon_packs` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '搭售加量包(resourceType:包数,逗号分隔;扩展包独立单为空)',
  `period_days` int NOT NULL DEFAULT '0' COMMENT '席位加购计价周期=下单时剩余天数(套餐/客户单为0)',
  `amount` decimal(20,8) NOT NULL COMMENT '订单金额',
  `currency` varchar(16) COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'USDT' COMMENT '币种',
  `pay_currency` varchar(32) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '下单选定收款网络(如 USDT-TRC20),决定收款地址所在链;旧单为空',
  `status` tinyint NOT NULL DEFAULT '0' COMMENT '状态 0待支付 1已完成 2已作废',
  `paid_time` datetime DEFAULT NULL COMMENT '完成时间',
  `expire_time` datetime DEFAULT NULL COMMENT '待支付订单过期时间(下单+24h)',
  `sign` varchar(64) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '关键字段HMAC-SHA256(防改库)',
  `create_by` bigint DEFAULT NULL,
  `create_time` datetime DEFAULT NULL,
  `update_by` bigint DEFAULT NULL,
  `update_time` datetime DEFAULT NULL,
  `del_flag` tinyint NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_order_no` (`order_no`),
  KEY `idx_project_status` (`project_id`,`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='订阅订单';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bil_order`
--

LOCK TABLES `bil_order` WRITE;
/*!40000 ALTER TABLE `bil_order` DISABLE KEYS */;
INSERT INTO `bil_order` VALUES (325579686430113792,'20260617181726218667',322576880446210048,'new',NULL,1,'基础版',6,3,0,NULL,0,1134.00000000,'USDT','USDT-TRC20',2,NULL,'2026-06-18 18:17:26','7d2bd8c28001abff868a70c2cc4ebdd27046d584277cd97873aa1e89c78a52ac',322576880534290432,'2026-06-17 18:17:26',322576880534290432,'2026-06-17 18:19:32',0),(325580241797906432,'20260617181938632691',322576880446210048,'new',NULL,1,'基础版',6,3,0,NULL,0,1134.00000000,'USDT','USDT-TRC20',2,NULL,'2026-06-18 18:19:39','aed90778091da0b2a5adf1f0861761aec916483a2b851e35f660b491dde46a7f',322576880534290432,'2026-06-17 18:19:39',322576880534290432,'2026-06-17 18:29:43',0),(325931966006296576,'20260618173716212023',322576880446210048,'renew',NULL,4,'旗舰版',6,31,0,'translate_char:1,ai_tokens:1,customer:1',0,5023.00000000,'USDT','USDT-TRC20',2,NULL,'2026-06-19 17:37:16','9bdff3b9e1c3d8c412566bfde77827c9d1db14cac0d913b1debaa12bf596e70e',322576880534290432,'2026-06-18 17:37:16',322576880534290432,'2026-06-18 17:37:55',0),(325932187599765504,'20260618173809047398',322576880446210048,'addon_translate','translate_char',4,'旗舰版',0,0,3000000,NULL,0,207.00000000,'USDT','USDT-TRC20',2,NULL,'2026-06-19 17:38:09','1cbbe78e41beb7f8127854780d19a0b377b0416141e12776d9587c036333144f',322576880534290432,'2026-06-18 17:38:09',322576880534290432,'2026-06-18 17:38:51',0),(325944919019487232,'20260618182844449357',322576880446210048,'addon_seat','seat',4,'旗舰版',0,2,0,NULL,16,21.33000000,'USDT','USDT-TRC20',2,NULL,'2026-06-19 18:28:44','629464b06b7f934e518031c93fb1f86075d3e5b0f5e7558cc38be24cb1237452',322576880534290432,'2026-06-18 18:28:44',322576880534290432,'2026-06-18 18:28:46',0),(325944949327527936,'20260618182851680080',322576880446210048,'addon_translate','translate_char',4,'旗舰版',0,0,10000000,NULL,0,690.00000000,'USDT','USDT-TRC20',2,NULL,'2026-06-19 18:28:52','70331d4dfb4f17cd20a28cb045e2677af0140ace774ec9314b72f4911b8b1e2a',322576880534290432,'2026-06-18 18:28:52',322576880534290432,'2026-06-18 18:28:52',0),(325944975214772224,'20260618182857853281',322576880446210048,'addon_tokens','ai_tokens',4,'旗舰版',0,0,10000000,NULL,0,200.00000000,'USDT','USDT-TRC20',2,NULL,'2026-06-19 18:28:58','5a59138f29bbf3bb09e20ed1e8e376cc3cab818edd06f4cf412da1720ca383f8',322576880534290432,'2026-06-18 18:28:58',322576880534290432,'2026-06-18 18:28:59',0),(325945005510230016,'20260618182905076327',322576880446210048,'addon_customer','customer',4,'旗舰版',0,0,10000,NULL,0,200.00000000,'USDT','USDT-TRC20',2,NULL,'2026-06-19 18:29:05','941404d9ada670f91a1313e7867483318cb68d46a7e0d1e81e6c9b824e1af90f',322576880534290432,'2026-06-18 18:29:05',322576880534290432,'2026-06-18 18:29:05',0);
/*!40000 ALTER TABLE `bil_order` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bil_project_resource`
--

DROP TABLE IF EXISTS `bil_project_resource`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bil_project_resource` (
  `id` bigint NOT NULL COMMENT '主键(雪花ID)',
  `project_id` bigint NOT NULL COMMENT '项目id(租户)',
  `resource_type` varchar(32) COLLATE utf8mb4_general_ci NOT NULL COMMENT '资源类型 customer/translate_char/ai_tokens(永久加量包)',
  `purchased_amount` bigint NOT NULL DEFAULT '0' COMMENT '已购加量包配额累计(永久,不随订阅到期)',
  `create_by` bigint DEFAULT NULL COMMENT '创建者',
  `create_time` datetime DEFAULT NULL COMMENT '创建时间',
  `update_by` bigint DEFAULT NULL COMMENT '更新者',
  `update_time` datetime DEFAULT NULL COMMENT '更新时间',
  `del_flag` tinyint NOT NULL DEFAULT '0' COMMENT '删除标志 0存在 1删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_project_res` (`project_id`,`resource_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='项目级永久加量包配额';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bil_project_resource`
--

LOCK TABLES `bil_project_resource` WRITE;
/*!40000 ALTER TABLE `bil_project_resource` DISABLE KEYS */;
INSERT INTO `bil_project_resource` VALUES (325854692066328576,322576880446210048,'customer',120,0,'2026-06-18 15:29:06',NULL,NULL,0);
/*!40000 ALTER TABLE `bil_project_resource` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bil_recharge`
--

DROP TABLE IF EXISTS `bil_recharge`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bil_recharge` (
  `id` bigint NOT NULL COMMENT '主键(雪花ID)',
  `project_id` bigint NOT NULL COMMENT '项目id',
  `address` varchar(128) COLLATE utf8mb4_general_ci NOT NULL COMMENT '收款地址(明文,回调比对用)',
  `amount` decimal(20,8) NOT NULL COMMENT '到账金额',
  `currency` varchar(32) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '币种(如 USDT-ERC20)',
  `chain_id` varchar(32) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '链id',
  `token_id` varchar(128) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '代币id',
  `txid` varchar(128) COLLATE utf8mb4_general_ci NOT NULL COMMENT '交易哈希(唯一,幂等)',
  `block_height` varchar(32) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '区块高度',
  `sign` varchar(64) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '关键字段HMAC(防改库)',
  `create_by` bigint DEFAULT NULL,
  `create_time` datetime DEFAULT NULL,
  `update_by` bigint DEFAULT NULL,
  `update_time` datetime DEFAULT NULL,
  `del_flag` tinyint NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_txid` (`txid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='充值流水';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bil_recharge`
--

LOCK TABLES `bil_recharge` WRITE;
/*!40000 ALTER TABLE `bil_recharge` DISABLE KEYS */;
/*!40000 ALTER TABLE `bil_recharge` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bil_subscription`
--

DROP TABLE IF EXISTS `bil_subscription`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bil_subscription` (
  `id` bigint NOT NULL COMMENT '主键(雪花ID)',
  `project_id` bigint NOT NULL COMMENT '项目id(租户)',
  `plan_id` bigint NOT NULL COMMENT '套餐id',
  `plan_code` varchar(32) COLLATE utf8mb4_general_ci NOT NULL COMMENT '套餐编码(快照)',
  `plan_name` varchar(64) COLLATE utf8mb4_general_ci NOT NULL COMMENT '套餐名称(快照)',
  `seats` int NOT NULL DEFAULT '0' COMMENT '加购席位数(套餐配额之外)',
  `extra_customers` int NOT NULL DEFAULT '0' COMMENT '加购客户配额(套餐配额之外);有效客户配额=套餐 customer 配额 + 本字段',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '状态 1有效 0已过期',
  `start_time` datetime NOT NULL COMMENT '生效时间(开通次日起算)',
  `expire_time` datetime NOT NULL COMMENT '到期时间',
  `create_by` bigint DEFAULT NULL,
  `create_time` datetime DEFAULT NULL,
  `update_by` bigint DEFAULT NULL,
  `update_time` datetime DEFAULT NULL,
  `del_flag` tinyint NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_project` (`project_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='项目订阅';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bil_subscription`
--

LOCK TABLES `bil_subscription` WRITE;
/*!40000 ALTER TABLE `bil_subscription` DISABLE KEYS */;
INSERT INTO `bil_subscription` VALUES (325854692066328576,322576880446210048,4,'flagship','旗舰版',31,120,1,'2026-06-18 12:30:13','2026-07-03 23:59:59',1,'2026-06-18 12:30:13',1,'2026-06-18 15:29:06',0);
/*!40000 ALTER TABLE `bil_subscription` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bil_subscription_log`
--

DROP TABLE IF EXISTS `bil_subscription_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bil_subscription_log` (
  `id` bigint NOT NULL COMMENT '主键(雪花ID)',
  `project_id` bigint NOT NULL COMMENT '项目ID',
  `action` varchar(16) NOT NULL COMMENT '动作 grant手动开通/cancel停用',
  `plan_name` varchar(64) DEFAULT NULL COMMENT '套餐名(grant 时)',
  `seats` int DEFAULT NULL COMMENT '加购席位(grant 时)',
  `extra_customers` int DEFAULT NULL COMMENT '加购客户配额(grant 时)',
  `expire_time` datetime DEFAULT NULL COMMENT '到期时间(grant 时)',
  `operator` bigint DEFAULT NULL COMMENT '操作后管账号ID',
  `create_by` bigint DEFAULT NULL,
  `create_time` datetime DEFAULT NULL,
  `update_by` bigint DEFAULT NULL,
  `update_time` datetime DEFAULT NULL,
  `del_flag` tinyint NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_project` (`project_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='订阅操作日志';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bil_subscription_log`
--

LOCK TABLES `bil_subscription_log` WRITE;
/*!40000 ALTER TABLE `bil_subscription_log` DISABLE KEYS */;
INSERT INTO `bil_subscription_log` VALUES (325854692104077312,322576880446210048,'grant','旗舰版',2,20,'2026-07-03 23:59:59',1,1,'2026-06-18 12:30:13',1,'2026-06-18 12:30:13',0),(325875932319580160,322576880446210048,'grant','旗舰版',2,120,'2026-07-03 23:59:59',1,1,'2026-06-18 13:54:37',1,'2026-06-18 13:54:37',0);
/*!40000 ALTER TABLE `bil_subscription_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bil_wallet`
--

DROP TABLE IF EXISTS `bil_wallet`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bil_wallet` (
  `id` bigint NOT NULL COMMENT '主键(雪花ID)',
  `project_id` bigint NOT NULL COMMENT '项目id',
  `balance` decimal(20,8) NOT NULL DEFAULT '0.00000000' COMMENT '余额',
  `currency` varchar(16) COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'USDT' COMMENT '币种',
  `version` int NOT NULL DEFAULT '0' COMMENT '乐观锁版本(余额并发更新防丢失)',
  `sign` varchar(64) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'project_id+balance 的 HMAC(防改库改余额)',
  `create_by` bigint DEFAULT NULL,
  `create_time` datetime DEFAULT NULL,
  `update_by` bigint DEFAULT NULL,
  `update_time` datetime DEFAULT NULL,
  `del_flag` tinyint NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_project` (`project_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='项目钱包余额';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bil_wallet`
--

LOCK TABLES `bil_wallet` WRITE;
/*!40000 ALTER TABLE `bil_wallet` DISABLE KEYS */;
/*!40000 ALTER TABLE `bil_wallet` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cnv_assign_log`
--

DROP TABLE IF EXISTS `cnv_assign_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cnv_assign_log` (
  `id` bigint NOT NULL COMMENT '主键(雪花ID)',
  `project_id` bigint NOT NULL COMMENT '项目id',
  `conversation_id` bigint NOT NULL COMMENT '会话id',
  `from_member_id` bigint DEFAULT NULL COMMENT '原负责人(可空)',
  `to_member_id` bigint DEFAULT NULL COMMENT '新负责人',
  `type` tinyint NOT NULL COMMENT '类型 1自动分配 2手动认领 3转派 4禁用/删除转派',
  `operator_member_id` bigint DEFAULT NULL COMMENT '操作人',
  `create_by` bigint DEFAULT NULL COMMENT '创建者',
  `create_time` datetime DEFAULT NULL COMMENT '创建时间',
  `update_by` bigint DEFAULT NULL COMMENT '更新者',
  `update_time` datetime DEFAULT NULL COMMENT '更新时间',
  `del_flag` tinyint NOT NULL DEFAULT '0' COMMENT '删除标志 0存在 1删除',
  PRIMARY KEY (`id`),
  KEY `idx_conversation` (`conversation_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='会话分配/转派记录';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cnv_assign_log`
--

LOCK TABLES `cnv_assign_log` WRITE;
/*!40000 ALTER TABLE `cnv_assign_log` DISABLE KEYS */;
INSERT INTO `cnv_assign_log` VALUES (325126506168713216,322576880446210048,325126506051272704,NULL,322576880534290432,3,NULL,0,'2026-06-16 12:16:40',0,'2026-06-16 12:16:40',0),(325126531712024576,322576880446210048,325126531615555584,NULL,324736000578289664,3,NULL,0,'2026-06-16 12:16:46',0,'2026-06-16 12:16:46',0),(325134684554002432,322576880446210048,325134684423979008,NULL,322576880534290432,3,NULL,0,'2026-06-16 12:49:10',0,'2026-06-16 12:49:10',0),(325158450466127872,322576880446210048,325158450302550016,NULL,324736000578289664,3,NULL,0,'2026-06-16 14:23:36',0,'2026-06-16 14:23:36',0),(325158612747943936,322576880446210048,325158612676640768,NULL,322576880534290432,3,NULL,0,'2026-06-16 14:24:14',0,'2026-06-16 14:24:14',0),(325192090902331392,322576880446210048,325126506051272704,322576880534290432,NULL,4,322576880534290432,322576880534290432,'2026-06-16 16:37:16',322576880534290432,'2026-06-16 16:37:16',0),(325213099080548352,322576880446210048,325126506051272704,322576880534290432,NULL,4,322576880534290432,322576880534290432,'2026-06-16 18:00:45',322576880534290432,'2026-06-16 18:00:45',0),(325213488676864000,322576880446210048,325126506051272704,322576880534290432,NULL,4,322576880534290432,322576880534290432,'2026-06-16 18:02:18',322576880534290432,'2026-06-16 18:02:18',0),(325215408514662400,322576880446210048,325126506051272704,322576880534290432,NULL,4,322576880534290432,322576880534290432,'2026-06-16 18:09:56',322576880534290432,'2026-06-16 18:09:56',0),(325215746999189504,322576880446210048,325126506051272704,NULL,322576880534290432,1,322576880534290432,322576880534290432,'2026-06-16 18:11:16',322576880534290432,'2026-06-16 18:11:16',0),(325224454663700480,322576880446210048,325158612676640768,322576880534290432,322576880534290432,1,322576880534290432,322576880534290432,'2026-06-16 18:45:52',322576880534290432,'2026-06-16 18:45:52',0),(325224523907465216,322576880446210048,325126506051272704,322576880534290432,322576880534290432,1,322576880534290432,322576880534290432,'2026-06-16 18:46:09',322576880534290432,'2026-06-16 18:46:09',0),(325224580115333120,322576880446210048,325134684423979008,322576880534290432,322576880534290432,1,322576880534290432,322576880534290432,'2026-06-16 18:46:22',322576880534290432,'2026-06-16 18:46:22',0),(325449485155041280,322576880446210048,325134684423979008,322576880534290432,322576880534290432,1,322576880534290432,322576880534290432,'2026-06-17 09:40:04',322576880534290432,'2026-06-17 09:40:04',0),(325449638238748672,322576880446210048,325126506051272704,322576880534290432,322576880534290432,1,322576880534290432,322576880534290432,'2026-06-17 09:40:40',322576880534290432,'2026-06-17 09:40:40',0),(325449661571661824,322576880446210048,325158612676640768,322576880534290432,322576880534290432,1,322576880534290432,322576880534290432,'2026-06-17 09:40:46',322576880534290432,'2026-06-17 09:40:46',0),(325450171313815552,322576880446210048,325158612676640768,322576880534290432,324736000578289664,2,324736000578289664,324736000578289664,'2026-06-17 09:42:47',324736000578289664,'2026-06-17 09:42:47',0),(325450299303002112,322576880446210048,325158612676640768,324736000578289664,324736000578289664,1,324736000578289664,324736000578289664,'2026-06-17 09:43:18',324736000578289664,'2026-06-17 09:43:18',0),(325471743156158464,322576880446210048,325126506051272704,322576880534290432,322576880534290432,1,322576880534290432,322576880534290432,'2026-06-17 11:08:31',322576880534290432,'2026-06-17 11:08:31',0),(325874788528553984,322576880446210048,325874788356587520,NULL,324736000578289664,3,NULL,0,'2026-06-18 13:50:04',0,'2026-06-18 13:50:04',0),(325875028828618752,322576880446210048,325875028753121280,NULL,322576880534290432,3,NULL,0,'2026-06-18 13:51:01',0,'2026-06-18 13:51:01',0);
/*!40000 ALTER TABLE `cnv_assign_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cnv_conversation`
--

DROP TABLE IF EXISTS `cnv_conversation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cnv_conversation` (
  `id` bigint NOT NULL COMMENT '主键(雪花ID)',
  `project_id` bigint NOT NULL COMMENT '项目id',
  `customer_id` bigint NOT NULL COMMENT '客户id',
  `group_id` bigint DEFAULT NULL COMMENT '客服组id',
  `assignee_member_id` bigint DEFAULT NULL COMMENT '负责人成员id(空=未分配)',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '状态 0等待队列 1进行中 2已结束',
  `source` varchar(16) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '来源 pc/app',
  `device_info` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '设备/来源信息(URL+浏览器+系统 或 APP+机型)',
  `ip` varchar(64) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '客户IP(会话资料展示)',
  `location` varchar(64) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '客户所在地(会话资料展示)',
  `auto_translate` tinyint NOT NULL DEFAULT '0' COMMENT '该会话是否开启自动翻译',
  `unread_count` int NOT NULL DEFAULT '0' COMMENT '坐席侧未读数',
  `last_seq` bigint NOT NULL DEFAULT '0' COMMENT '会话内已分配最大消息序号',
  `customer_read_seq` bigint NOT NULL DEFAULT '0' COMMENT '客户已读到的seq(已读回执)',
  `last_message_preview` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '最后一条消息预览',
  `last_message_at` datetime DEFAULT NULL COMMENT '最后消息时间',
  `closed_at` datetime DEFAULT NULL COMMENT '结束时间',
  `create_by` bigint DEFAULT NULL COMMENT '创建者',
  `create_time` datetime DEFAULT NULL COMMENT '创建时间',
  `update_by` bigint DEFAULT NULL COMMENT '更新者',
  `update_time` datetime DEFAULT NULL COMMENT '更新时间',
  `del_flag` tinyint NOT NULL DEFAULT '0' COMMENT '删除标志 0存在 1删除',
  `last_sender_avatar` varchar(512) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '最后一条消息发送者头像快照',
  `last_sender_name` varchar(128) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '最后一条消息发送者昵称快照',
  PRIMARY KEY (`id`),
  KEY `idx_proj_status` (`project_id`,`status`),
  KEY `idx_proj_assignee` (`project_id`,`assignee_member_id`),
  KEY `idx_customer` (`customer_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='会话';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cnv_conversation`
--

LOCK TABLES `cnv_conversation` WRITE;
/*!40000 ALTER TABLE `cnv_conversation` DISABLE KEYS */;
INSERT INTO `cnv_conversation` VALUES (325126506051272704,322576880446210048,325121651190530048,324852429583548416,322576880534290432,2,'web',NULL,'0:0:0:0:0:0:0:1',NULL,0,0,104,102,'会话超时结束','2026-06-17 19:27:00','2026-06-17 19:27:00',0,'2026-06-16 12:16:40',0,'2026-06-16 12:16:40',0,'http://localhost:9000/aitalky/2026/06/09/eef6f4fed79348e29f35e17995054b7c.jpg','Negan-01'),(325126531615555584,322576880446210048,325121651190530048,NULL,324736000578289664,2,'web',NULL,'0:0:0:0:0:0:0:1',NULL,0,0,35,34,'会话超时结束','2026-06-16 18:33:00','2026-06-16 18:33:00',0,'2026-06-16 12:16:46',0,'2026-06-16 12:16:46',0,'http://localhost:9000/aitalky/2026/06/09/eef6f4fed79348e29f35e17995054b7c.jpg','Negan-01'),(325134684423979008,322576880446210048,323645610374725632,NULL,322576880534290432,2,'web',NULL,'0:0:0:0:0:0:0:1',NULL,0,0,24,14,'会话超时结束','2026-06-17 09:44:00','2026-06-17 09:44:00',0,'2026-06-16 12:49:09',0,'2026-06-16 12:49:09',0,'http://localhost:9000/aitalky/2026/06/09/eef6f4fed79348e29f35e17995054b7c.jpg','Negan-01'),(325158450302550016,322576880446210048,325122433742798848,NULL,324736000578289664,2,'web',NULL,'0:0:0:0:0:0:0:1',NULL,0,0,4,2,'会话超时结束','2026-06-16 18:33:00','2026-06-16 18:33:00',0,'2026-06-16 14:23:36',0,'2026-06-16 14:23:36',0,'http://localhost:9000/aitalky/2026/06/09/eef6f4fed79348e29f35e17995054b7c.jpg','Negan-01'),(325158612676640768,322576880446210048,325123746018885632,NULL,324736000578289664,2,'web',NULL,'0:0:0:0:0:0:0:1',NULL,0,0,24,22,'会话超时结束','2026-06-17 09:45:00','2026-06-17 09:45:00',0,'2026-06-16 14:24:14',0,'2026-06-16 14:24:14',0,'https://api.dicebear.com/9.x/avataaars/svg?seed=324736000578289664','peter999'),(325874788356587520,322576880446210048,325122433742798848,324852429583548416,324736000578289664,2,'web',NULL,'0:0:0:0:0:0:0:1',NULL,0,0,4,3,'会话超时结束','2026-06-18 15:51:00','2026-06-18 15:51:00',0,'2026-06-18 13:50:04',0,'2026-06-18 13:50:04',0,'http://localhost:9000/aitalky/2026/06/09/eef6f4fed79348e29f35e17995054b7c.jpg','Negan-01'),(325875028753121280,322576880446210048,325875028673429504,324852429583548416,322576880534290432,2,'web',NULL,'0:0:0:0:0:0:0:1',NULL,0,0,4,3,'会话超时结束','2026-06-18 15:52:00','2026-06-18 15:52:00',0,'2026-06-18 13:51:01',0,'2026-06-18 13:51:01',0,'http://localhost:9000/aitalky/2026/06/09/eef6f4fed79348e29f35e17995054b7c.jpg','Negan-01');
/*!40000 ALTER TABLE `cnv_conversation` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cus_customer`
--

DROP TABLE IF EXISTS `cus_customer`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cus_customer` (
  `id` bigint NOT NULL COMMENT '主键(雪花ID)',
  `project_id` bigint NOT NULL COMMENT '项目id',
  `external_user_id` varchar(128) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '业务UID(用户态,跨设备聚合;复杂无序)',
  `visitor_id` varchar(64) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '游客设备/缓存标识(匿名态,专属会话模式)',
  `name` varchar(64) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '名称(系统随机生成)',
  `avatar` varchar(256) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '头像(系统随机生成)',
  `type` tinyint DEFAULT NULL COMMENT '类型 1游客 2用户',
  `source_language` varchar(16) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '客户源语言(翻译用)',
  `contact` varchar(128) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '联系方式(会话资料展示)',
  `email` varchar(128) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '邮箱',
  `custom_attrs` json DEFAULT NULL COMMENT '自定义属性(钱包地址/链/交易号等Web3字段)',
  `create_by` bigint DEFAULT NULL COMMENT '创建者',
  `create_time` datetime DEFAULT NULL COMMENT '创建时间',
  `update_by` bigint DEFAULT NULL COMMENT '更新者',
  `update_time` datetime DEFAULT NULL COMMENT '更新时间',
  `del_flag` tinyint NOT NULL DEFAULT '0' COMMENT '删除标志 0存在 1删除',
  PRIMARY KEY (`id`),
  KEY `idx_proj_ext` (`project_id`,`external_user_id`),
  KEY `idx_proj_visitor` (`project_id`,`visitor_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='客户';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cus_customer`
--

LOCK TABLES `cus_customer` WRITE;
/*!40000 ALTER TABLE `cus_customer` DISABLE KEYS */;
INSERT INTO `cus_customer` VALUES (322608830846337024,322580673657307136,'u-1001',NULL,'Ava Stone','https://api.dicebear.com/7.x/avataaars/svg?seed=322608830846337024',2,'zh_CN',NULL,NULL,NULL,0,'2026-06-09 13:32:19',0,'2026-06-09 13:32:19',0),(322609110195372032,322576880446210048,'u-2002',NULL,'Emma Lee','https://api.dicebear.com/7.x/avataaars/svg?seed=322609110195372032',2,'zh_CN',NULL,NULL,NULL,0,'2026-06-09 13:33:26',0,'2026-06-09 13:33:26',0),(322623519647072256,322576880446210048,'u-ws-1',NULL,'Zona Hobson','https://api.dicebear.com/7.x/avataaars/svg?seed=322623519647072256',2,'zh_CN',NULL,NULL,NULL,0,'2026-06-09 14:30:41',0,'2026-06-09 14:30:41',0),(322623950666334208,322576880446210048,'u-ws-2',NULL,'Mia Brown','https://api.dicebear.com/7.x/avataaars/svg?seed=322623950666334208',2,'zh_CN',NULL,NULL,NULL,0,'2026-06-09 14:32:24',0,'2026-06-09 14:32:24',0),(322624929793048576,322576880446210048,'u-ws-3',NULL,'Noah Lee','https://api.dicebear.com/7.x/avataaars/svg?seed=322624929793048576',2,'zh_CN',NULL,NULL,NULL,0,'2026-06-09 14:36:17',0,'2026-06-09 14:36:17',0),(322625638911442944,322576880446210048,'u-sync-1',NULL,'Ava Stone1','https://api.dicebear.com/7.x/avataaars/svg?seed=322625638911442944',2,'zh_CN',NULL,NULL,NULL,0,'2026-06-09 14:39:06',0,'2026-06-09 14:39:06',0),(322626065614766080,322576880446210048,'u-final',NULL,'Liam Hobson1','https://api.dicebear.com/7.x/avataaars/svg?seed=322626065614766080',2,'zh_CN',NULL,NULL,NULL,0,'2026-06-09 14:40:48',0,'2026-06-09 14:40:48',0),(322674653304717312,322576880446210048,NULL,'v_4c95e2eb-7682-44f6-a459-9fc61e0bfc9a','Olivia Hobson','https://api.dicebear.com/7.x/avataaars/svg?seed=322674653304717312',1,'zh_CN','','',NULL,0,'2026-06-09 17:53:52',0,'2026-06-09 17:53:52',0),(322676524958351360,322576880446210048,'u1',NULL,'Mia Carnegie','https://api.dicebear.com/7.x/avataaars/svg?seed=322676524958351360',2,'zh_CN','1231231','拥有一批、',NULL,0,'2026-06-09 18:01:19',0,'2026-06-09 18:01:19',0),(322685586240438272,322576880446210048,'verify-001',NULL,'Olivia Brown','https://api.dicebear.com/7.x/avataaars/svg?seed=322685586240438272',2,'zh_CN',NULL,NULL,NULL,0,'2026-06-09 18:37:19',0,'2026-06-09 18:37:19',0),(322705724004106240,322576880446210048,'regress-1',NULL,'Nora Davis','https://api.dicebear.com/7.x/avataaars/svg?seed=322705724004106240',2,'zh_CN',NULL,NULL,NULL,0,'2026-06-09 19:57:20',0,'2026-06-09 19:57:20',0),(323645372318613504,322576880446210048,NULL,'test-visitor-precheck','Lucas Carnegie','https://api.dicebear.com/7.x/avataaars/svg?seed=323645372318613504',1,NULL,NULL,NULL,NULL,0,'2026-06-12 10:11:10',0,'2026-06-12 10:11:10',0),(323645610374725632,322576880446210048,NULL,'v_65f4c8e5-6564-4105-9c2d-5334418f1a10','Olivia Smith','https://api.dicebear.com/7.x/avataaars/svg?seed=323645610374725632',1,'zh_CN','19293','123',NULL,0,'2026-06-12 10:12:07',0,'2026-06-12 10:12:07',0),(323663069739745280,322576880446210048,NULL,'diag-visitor-1','Olivia Wang','https://api.dicebear.com/7.x/avataaars/svg?seed=323663069739745280',1,NULL,NULL,NULL,NULL,0,'2026-06-12 11:21:29',0,'2026-06-12 11:21:29',0),(323664657606770688,322576880446210048,NULL,'v_test_debug','Leo Brown','https://api.dicebear.com/7.x/avataaars/svg?seed=323664657606770688',1,'en',NULL,NULL,NULL,0,'2026-06-12 11:27:48',0,'2026-06-12 11:27:48',0),(323686052176855040,322576880446210048,'100001',NULL,'Emma Stone','https://api.dicebear.com/7.x/avataaars/svg?seed=323686052176855040',2,'',NULL,NULL,NULL,0,'2026-06-12 12:52:49',0,'2026-06-12 12:52:49',0),(323687453535764480,322576880446210048,'100002',NULL,'Zona Smith','https://api.dicebear.com/7.x/avataaars/svg?seed=323687453535764480',2,'',NULL,NULL,NULL,0,'2026-06-12 12:58:23',0,'2026-06-12 12:58:23',0),(323697534100832256,322576880446210048,'100003',NULL,'Liam Hobson','https://api.dicebear.com/7.x/avataaars/svg?seed=323697534100832256',2,'',NULL,NULL,NULL,0,'2026-06-12 13:38:26',0,'2026-06-12 13:38:26',0),(324786429274095616,322576880446210048,'1000088',NULL,'Layla Bailey','https://api.dicebear.com/7.x/avataaars/svg?seed=324786429274095616',2,'',NULL,NULL,NULL,0,'2026-06-15 13:45:19',0,'2026-06-15 13:45:19',0),(324806350309687296,322576880446210048,'1000080',NULL,'Maverick Thompson','https://api.dicebear.com/7.x/avataaars/svg?seed=324806350309687296',2,'',NULL,NULL,NULL,0,'2026-06-15 15:04:29',0,'2026-06-15 15:04:29',0),(324807544943935488,322576880446210048,'1000081',NULL,'Hazel Evans','https://api.dicebear.com/7.x/avataaars/svg?seed=324807544943935488',2,'',NULL,NULL,NULL,0,'2026-06-15 15:09:13',0,'2026-06-15 15:09:13',0),(324815131382906880,322576880446210048,'1000082',NULL,'Oliver Bennett','https://api.dicebear.com/7.x/avataaars/svg?seed=324815131382906880',2,'',NULL,NULL,NULL,0,'2026-06-15 15:39:22',0,'2026-06-15 15:39:22',0),(324815478746775552,322576880446210048,'1000083',NULL,'Oliver Green','https://api.dicebear.com/7.x/avataaars/svg?seed=324815478746775552',2,'',NULL,NULL,NULL,0,'2026-06-15 15:40:45',0,'2026-06-15 15:40:45',0),(324815952241754112,322576880446210048,'1000084',NULL,'Mia Rodriguez','https://api.dicebear.com/7.x/avataaars/svg?seed=324815952241754112',2,'',NULL,NULL,NULL,0,'2026-06-15 15:42:38',0,'2026-06-15 15:42:38',0),(324816220232613888,322576880446210048,'1000085',NULL,'Jackson Thompson','https://api.dicebear.com/7.x/avataaars/svg?seed=324816220232613888',2,'',NULL,NULL,NULL,0,'2026-06-15 15:43:42',0,'2026-06-15 15:43:42',0),(324816573380427776,322576880446210048,'1000086',NULL,'Luna Price','https://api.dicebear.com/7.x/avataaars/svg?seed=324816573380427776',2,'',NULL,NULL,NULL,0,'2026-06-15 15:45:06',0,'2026-06-15 15:45:06',0),(324816839680983040,322576880446210048,'1000087',NULL,'Grayson Nelson','https://api.dicebear.com/7.x/avataaars/svg?seed=324816839680983040',2,'',NULL,NULL,NULL,0,'2026-06-15 15:46:09',0,'2026-06-15 15:46:09',0),(324816974573993984,322576880446210048,'1000089',NULL,'Nova Rogers','https://api.dicebear.com/7.x/avataaars/svg?seed=324816974573993984',2,'',NULL,NULL,NULL,0,'2026-06-15 15:46:42',0,'2026-06-15 15:46:42',0),(324817042391695360,322576880446210048,'101',NULL,'Luca Hall','https://api.dicebear.com/7.x/avataaars/svg?seed=324817042391695360',2,'',NULL,NULL,NULL,0,'2026-06-15 15:46:58',0,'2026-06-15 15:46:58',0),(324817110201008128,322576880446210048,'102',NULL,'Zoe Russell','https://api.dicebear.com/7.x/avataaars/svg?seed=324817110201008128',2,'',NULL,NULL,NULL,0,'2026-06-15 15:47:14',0,'2026-06-15 15:47:14',0),(324817143377952768,322576880446210048,'105',NULL,'Ella Watson','https://api.dicebear.com/7.x/avataaars/svg?seed=324817143377952768',2,'',NULL,NULL,NULL,0,'2026-06-15 15:47:22',0,'2026-06-15 15:47:22',0),(324817369383829504,322576880446210048,'106',NULL,'Luna Cruz','https://api.dicebear.com/7.x/avataaars/svg?seed=324817369383829504',2,'',NULL,NULL,NULL,0,'2026-06-15 15:48:16',0,'2026-06-15 15:48:16',0),(324817447209140224,322576880446210048,'107',NULL,'Wyatt Nguyen','https://api.dicebear.com/7.x/avataaars/svg?seed=324817447209140224',2,'',NULL,NULL,NULL,0,'2026-06-15 15:48:34',0,'2026-06-15 15:48:34',0),(324818969569525760,322576880446210048,'108',NULL,'Camila Stewart','https://api.dicebear.com/7.x/avataaars/svg?seed=324818969569525760',2,'',NULL,NULL,NULL,0,'2026-06-15 15:54:37',0,'2026-06-15 15:54:37',0),(324819106358362112,322576880446210048,'109',NULL,'David Smith','https://api.dicebear.com/7.x/avataaars/svg?seed=324819106358362112',2,'',NULL,NULL,NULL,0,'2026-06-15 15:55:10',0,'2026-06-15 15:55:10',0),(324819170946449408,322576880446210048,'110',NULL,'Olivia Young','https://api.dicebear.com/7.x/avataaars/svg?seed=324819170946449408',2,'',NULL,NULL,NULL,0,'2026-06-15 15:55:25',0,'2026-06-15 15:55:25',0),(324819254178217984,322576880446210048,'111',NULL,'David Turner','https://api.dicebear.com/7.x/avataaars/svg?seed=324819254178217984',2,'',NULL,NULL,NULL,0,'2026-06-15 15:55:45',0,'2026-06-15 15:55:45',0),(324819528204681216,322576880446210048,'112',NULL,'Logan Carter','https://api.dicebear.com/7.x/avataaars/svg?seed=324819528204681216',2,'',NULL,NULL,NULL,0,'2026-06-15 15:56:50',0,'2026-06-15 15:56:50',0),(324824312605310976,322576880446210048,'113',NULL,'Ezra Bennett','https://api.dicebear.com/7.x/avataaars/svg?seed=324824312605310976',2,'',NULL,NULL,NULL,0,'2026-06-15 16:15:51',0,'2026-06-15 16:15:51',0),(324824397313474560,322576880446210048,'114',NULL,'Hazel Brooks','https://api.dicebear.com/7.x/avataaars/svg?seed=324824397313474560',2,'',NULL,NULL,NULL,0,'2026-06-15 16:16:11',0,'2026-06-15 16:16:11',0),(324824461037535232,322576880446210048,'115',NULL,'Zona White','https://api.dicebear.com/7.x/avataaars/svg?seed=324824461037535232',2,'',NULL,NULL,NULL,0,'2026-06-15 16:16:26',0,'2026-06-15 16:16:26',0),(324826009994002432,322576880446210048,'116',NULL,'Luna Ross','https://api.dicebear.com/7.x/avataaars/svg?seed=324826009994002432',2,'',NULL,NULL,NULL,0,'2026-06-15 16:22:36',0,'2026-06-15 16:22:36',0),(324826176784695296,322576880446210048,'117',NULL,'Grayson Murphy','https://api.dicebear.com/7.x/avataaars/svg?seed=324826176784695296',2,'',NULL,NULL,NULL,0,'2026-06-15 16:23:16',0,'2026-06-15 16:23:16',0),(324826211719053312,322576880446210048,'118',NULL,'Abigail Brown','https://api.dicebear.com/7.x/avataaars/svg?seed=324826211719053312',2,'',NULL,NULL,NULL,0,'2026-06-15 16:23:24',0,'2026-06-15 16:23:24',0),(324826332426928128,322576880446210048,'119',NULL,'Julian Lewis','https://api.dicebear.com/7.x/avataaars/svg?seed=324826332426928128',2,'',NULL,NULL,NULL,0,'2026-06-15 16:23:53',0,'2026-06-15 16:23:53',0),(324826382481752064,322576880446210048,'120',NULL,'Gabriel Edwards','https://api.dicebear.com/7.x/avataaars/svg?seed=324826382481752064',2,'',NULL,NULL,NULL,0,'2026-06-15 16:24:05',0,'2026-06-15 16:24:05',0),(324826426651967488,322576880446210048,'12',NULL,'Gabriel Lewis','https://api.dicebear.com/7.x/avataaars/svg?seed=324826426651967488',2,'',NULL,NULL,NULL,0,'2026-06-15 16:24:15',0,'2026-06-15 16:24:15',0),(324826609683005440,322576880446210048,'13',NULL,'Amelia White','https://api.dicebear.com/7.x/avataaars/svg?seed=324826609683005440',2,'',NULL,NULL,NULL,0,'2026-06-15 16:24:59',0,'2026-06-15 16:24:59',0),(324826703056601088,322576880446210048,'14',NULL,'Joseph Flores','https://api.dicebear.com/7.x/avataaars/svg?seed=324826703056601088',2,'',NULL,NULL,NULL,0,'2026-06-15 16:25:21',0,'2026-06-15 16:25:21',0),(324827927646568448,322576880446210048,'15',NULL,'David Ortiz','https://api.dicebear.com/7.x/avataaars/svg?seed=324827927646568448',2,'',NULL,NULL,NULL,0,'2026-06-15 16:30:13',0,'2026-06-15 16:30:13',0),(324828365221527552,322576880446210048,'16',NULL,'Riley Gray','https://api.dicebear.com/7.x/avataaars/svg?seed=324828365221527552',2,'',NULL,NULL,NULL,0,'2026-06-15 16:31:57',0,'2026-06-15 16:31:57',0),(324828404463435776,322576880446210048,'17',NULL,'Leo Watson','https://api.dicebear.com/7.x/avataaars/svg?seed=324828404463435776',2,'',NULL,NULL,NULL,0,'2026-06-15 16:32:07',0,'2026-06-15 16:32:07',0),(324828472268554240,322576880446210048,'18',NULL,'Daniel Smith','https://api.dicebear.com/7.x/avataaars/svg?seed=324828472268554240',2,'',NULL,NULL,NULL,0,'2026-06-15 16:32:23',0,'2026-06-15 16:32:23',0),(324828506129170432,322576880446210048,'19',NULL,'Jackson Thompson','https://api.dicebear.com/7.x/avataaars/svg?seed=324828506129170432',2,'',NULL,NULL,NULL,0,'2026-06-15 16:32:31',0,'2026-06-15 16:32:31',0),(324828538639220736,322576880446210048,'20',NULL,'Lucas Price','https://api.dicebear.com/7.x/avataaars/svg?seed=324828538639220736',2,'',NULL,NULL,NULL,0,'2026-06-15 16:32:39',0,'2026-06-15 16:32:39',0),(324828566527148032,322576880446210048,'21',NULL,'Lincoln Powell','https://api.dicebear.com/7.x/avataaars/svg?seed=324828566527148032',2,'',NULL,NULL,NULL,0,'2026-06-15 16:32:45',0,'2026-06-15 16:32:45',0),(324828653814808576,322576880446210048,'22',NULL,'Emily Hobson','https://api.dicebear.com/7.x/avataaars/svg?seed=324828653814808576',2,'',NULL,NULL,NULL,0,'2026-06-15 16:33:06',0,'2026-06-15 16:33:06',0),(324828683485315072,322576880446210048,'23',NULL,'Zoe Wright','https://api.dicebear.com/7.x/avataaars/svg?seed=324828683485315072',2,'',NULL,NULL,NULL,0,'2026-06-15 16:33:13',0,'2026-06-15 16:33:13',0),(324828713277456384,322576880446210048,'24',NULL,'Madison Ortiz','https://api.dicebear.com/7.x/avataaars/svg?seed=324828713277456384',2,'',NULL,NULL,NULL,0,'2026-06-15 16:33:20',0,'2026-06-15 16:33:20',0),(324828744244002816,322576880446210048,'26',NULL,'Levi Baker','https://api.dicebear.com/7.x/avataaars/svg?seed=324828744244002816',2,'',NULL,NULL,NULL,0,'2026-06-15 16:33:28',0,'2026-06-15 16:33:28',0),(324828773696405504,322576880446210048,'29',NULL,'Nova Long','https://api.dicebear.com/7.x/avataaars/svg?seed=324828773696405504',2,'',NULL,NULL,NULL,0,'2026-06-15 16:33:35',0,'2026-06-15 16:33:35',0),(324828795548729344,322576880446210048,'30',NULL,'Samuel Brooks','https://api.dicebear.com/7.x/avataaars/svg?seed=324828795548729344',2,'',NULL,NULL,NULL,0,'2026-06-15 16:33:40',0,'2026-06-15 16:33:40',0),(324828997428969472,322576880446210048,'31',NULL,'Lucas Jones','https://api.dicebear.com/7.x/avataaars/svg?seed=324828997428969472',2,'',NULL,NULL,NULL,0,'2026-06-15 16:34:28',0,'2026-06-15 16:34:28',0),(324829024721305600,322576880446210048,'32',NULL,'Aria Hall','https://api.dicebear.com/7.x/avataaars/svg?seed=324829024721305600',2,'',NULL,NULL,NULL,0,'2026-06-15 16:34:35',0,'2026-06-15 16:34:35',0),(324829052391129088,322576880446210048,'33',NULL,'Henry Harris','https://api.dicebear.com/7.x/avataaars/svg?seed=324829052391129088',2,'',NULL,NULL,NULL,0,'2026-06-15 16:34:41',0,'2026-06-15 16:34:41',0),(324829144829394944,322576880446210048,'2001',NULL,'Thomas Hobson','https://api.dicebear.com/7.x/avataaars/svg?seed=324829144829394944',2,'',NULL,NULL,NULL,0,'2026-06-15 16:35:03',0,'2026-06-15 16:35:03',0),(324829188806672384,322576880446210048,'2002',NULL,'Naomi Miller','https://api.dicebear.com/7.x/avataaars/svg?seed=324829188806672384',2,'',NULL,NULL,NULL,0,'2026-06-15 16:35:14',0,'2026-06-15 16:35:14',0),(324829216770097152,322576880446210048,'2004',NULL,'Daniel Hobson','https://api.dicebear.com/7.x/avataaars/svg?seed=324829216770097152',2,'',NULL,NULL,NULL,0,'2026-06-15 16:35:20',0,'2026-06-15 16:35:20',0),(324829429169651712,322576880446210048,'2005',NULL,'Grayson Richardson','https://api.dicebear.com/7.x/avataaars/svg?seed=324829429169651712',2,'',NULL,NULL,NULL,0,'2026-06-15 16:36:11',0,'2026-06-15 16:36:11',0),(324830003868991488,322576880446210048,'2006',NULL,'Jack Lewis','https://api.dicebear.com/7.x/avataaars/svg?seed=324830003868991488',2,'',NULL,NULL,NULL,0,'2026-06-15 16:38:28',0,'2026-06-15 16:38:28',0),(324831777493352448,322576880446210048,'2007',NULL,'Isaac Turner','https://api.dicebear.com/7.x/avataaars/svg?seed=324831777493352448',2,'',NULL,NULL,NULL,0,'2026-06-15 16:45:31',0,'2026-06-15 16:45:31',0),(324831912419917824,322576880446210048,'2008',NULL,'Sofia Phillips','https://api.dicebear.com/7.x/avataaars/svg?seed=324831912419917824',2,'',NULL,NULL,NULL,0,'2026-06-15 16:46:03',0,'2026-06-15 16:46:03',0),(324831949585645568,322576880446210048,'2009',NULL,'Aurora Howard','https://api.dicebear.com/7.x/avataaars/svg?seed=324831949585645568',2,'',NULL,NULL,NULL,0,'2026-06-15 16:46:12',0,'2026-06-15 16:46:12',0),(324832151855955968,322576880446210048,'2010',NULL,'David Stewart','https://api.dicebear.com/7.x/avataaars/svg?seed=324832151855955968',2,'',NULL,NULL,NULL,0,'2026-06-15 16:47:00',0,'2026-06-15 16:47:00',0),(324832527346827264,322576880446210048,'2011',NULL,'Aiden Murphy','https://api.dicebear.com/7.x/avataaars/svg?seed=324832527346827264',2,'',NULL,NULL,NULL,0,'2026-06-15 16:48:30',0,'2026-06-15 16:48:30',0),(324832711883620352,322576880446210048,'2012',NULL,'Amelia Taylor','https://api.dicebear.com/7.x/avataaars/svg?seed=324832711883620352',2,'',NULL,NULL,NULL,0,'2026-06-15 16:49:14',0,'2026-06-15 16:49:14',0),(324832770998140928,322576880446210048,'2013',NULL,'Matthew Collins','https://api.dicebear.com/7.x/avataaars/svg?seed=324832770998140928',2,'',NULL,NULL,NULL,0,'2026-06-15 16:49:28',0,'2026-06-15 16:49:28',0),(324832953098043392,322576880446210048,'2014',NULL,'Ezra Carnegie','https://api.dicebear.com/7.x/avataaars/svg?seed=324832953098043392',2,'',NULL,NULL,NULL,0,'2026-06-15 16:50:11',0,'2026-06-15 16:50:11',0),(324833938247778304,322576880446210048,'2015',NULL,'Anthony Long','https://api.dicebear.com/7.x/avataaars/svg?seed=324833938247778304',2,'',NULL,NULL,NULL,0,'2026-06-15 16:54:06',0,'2026-06-15 16:54:06',0),(324835461660934144,322576880446210048,'2016',NULL,'Charles Murphy','https://api.dicebear.com/7.x/avataaars/svg?seed=324835461660934144',2,'',NULL,NULL,NULL,0,'2026-06-15 17:00:09',0,'2026-06-15 17:00:09',0),(324835555185524736,322576880446210048,'2017',NULL,'Jacob Lee','https://api.dicebear.com/7.x/avataaars/svg?seed=324835555185524736',2,'',NULL,NULL,NULL,0,'2026-06-15 17:00:32',0,'2026-06-15 17:00:32',0),(324835625817604096,322576880446210048,'2018',NULL,'Zona Reyes','https://api.dicebear.com/7.x/avataaars/svg?seed=324835625817604096',2,'',NULL,NULL,NULL,0,'2026-06-15 17:00:48',0,'2026-06-15 17:00:48',0),(324835733980315648,322576880446210048,'2019',NULL,'Jacob Price','https://api.dicebear.com/7.x/avataaars/svg?seed=324835733980315648',2,'',NULL,NULL,NULL,0,'2026-06-15 17:01:14',0,'2026-06-15 17:01:14',0),(324835858324652032,322576880446210048,'2020',NULL,'Mason Collins','https://api.dicebear.com/7.x/avataaars/svg?seed=324835858324652032',2,'',NULL,NULL,NULL,0,'2026-06-15 17:01:44',0,'2026-06-15 17:01:44',0),(324835933910204416,322576880446210048,'2021',NULL,'Sophia Jenkins','https://api.dicebear.com/7.x/avataaars/svg?seed=324835933910204416',2,'',NULL,NULL,NULL,0,'2026-06-15 17:02:02',0,'2026-06-15 17:02:02',0),(324838427885305856,322576880446210048,'2022',NULL,'Aiden Jackson','https://api.dicebear.com/7.x/avataaars/svg?seed=324838427885305856',2,'',NULL,NULL,NULL,0,'2026-06-15 17:11:56',0,'2026-06-15 17:11:56',0),(324838625730625536,322576880446210048,'2023',NULL,'Ezra Perez','https://api.dicebear.com/7.x/avataaars/svg?seed=324838625730625536',2,'',NULL,NULL,NULL,0,'2026-06-15 17:12:44',0,'2026-06-15 17:12:44',0),(324842042171588608,322576880446210048,'2024',NULL,'Stella Bailey','https://api.dicebear.com/7.x/avataaars/svg?seed=324842042171588608',2,'',NULL,NULL,NULL,0,'2026-06-15 17:26:18',0,'2026-06-15 17:26:18',0),(324842105908232192,322576880446210048,'2025',NULL,'Stella Jenkins','https://api.dicebear.com/7.x/avataaars/svg?seed=324842105908232192',2,'',NULL,NULL,NULL,0,'2026-06-15 17:26:33',0,'2026-06-15 17:26:33',0),(324842185398681600,322576880446210048,'2026',NULL,'Chloe Walker','https://api.dicebear.com/7.x/avataaars/svg?seed=324842185398681600',2,'',NULL,NULL,NULL,0,'2026-06-15 17:26:52',0,'2026-06-15 17:26:52',0),(324843329780973568,322576880446210048,'2027',NULL,'Henry Jenkins','https://api.dicebear.com/7.x/avataaars/svg?seed=324843329780973568',2,'',NULL,NULL,NULL,0,'2026-06-15 17:31:25',0,'2026-06-15 17:31:25',0),(324843357018783744,322576880446210048,'2028',NULL,'Mateo Flores','https://api.dicebear.com/7.x/avataaars/svg?seed=324843357018783744',2,'',NULL,NULL,NULL,0,'2026-06-15 17:31:32',0,'2026-06-15 17:31:32',0),(324843385548439552,322576880446210048,'2029',NULL,'Evelyn Nguyen','https://api.dicebear.com/7.x/avataaars/svg?seed=324843385548439552',2,'',NULL,NULL,NULL,0,'2026-06-15 17:31:38',0,'2026-06-15 17:31:38',0),(324843428032544768,322576880446210048,'2040',NULL,'Emma Brooks','https://api.dicebear.com/7.x/avataaars/svg?seed=324843428032544768',2,'',NULL,NULL,NULL,0,'2026-06-15 17:31:49',0,'2026-06-15 17:31:49',0),(324843483393163264,322576880446210048,'2041',NULL,'Carter Diaz','https://api.dicebear.com/7.x/avataaars/svg?seed=324843483393163264',2,'',NULL,NULL,NULL,0,'2026-06-15 17:32:02',0,'2026-06-15 17:32:02',0),(324843878760841216,322576880446210048,'2042',NULL,'Noah Stone','https://api.dicebear.com/7.x/avataaars/svg?seed=324843878760841216',2,'',NULL,NULL,NULL,0,'2026-06-15 17:33:36',0,'2026-06-15 17:33:36',0),(324847491415539712,322576880446210048,'2046',NULL,'Lincoln Smith','https://api.dicebear.com/7.x/avataaars/svg?seed=324847491415539712',2,'',NULL,NULL,NULL,0,'2026-06-15 17:47:57',0,'2026-06-15 17:47:57',0),(324847566929788928,322576880446210048,'2047',NULL,'Mateo Smith','https://api.dicebear.com/7.x/avataaars/svg?seed=324847566929788928',2,'',NULL,NULL,NULL,0,'2026-06-15 17:48:15',0,'2026-06-15 17:48:15',0),(324847621426380800,322576880446210048,'2048',NULL,'Charles Jackson','https://api.dicebear.com/7.x/avataaars/svg?seed=324847621426380800',2,'',NULL,NULL,NULL,0,'2026-06-15 17:48:28',0,'2026-06-15 17:48:28',0),(324847723817730048,322576880446210048,'2049',NULL,'Violet Harris','https://api.dicebear.com/7.x/avataaars/svg?seed=324847723817730048',2,'',NULL,NULL,NULL,0,'2026-06-15 17:48:53',0,'2026-06-15 17:48:53',0),(324847789144014848,322576880446210048,'2050',NULL,'Gabriel Brooks','https://api.dicebear.com/7.x/avataaars/svg?seed=324847789144014848',2,'',NULL,NULL,NULL,0,'2026-06-15 17:49:08',0,'2026-06-15 17:49:08',0),(324848776302821376,322576880446210048,'2051',NULL,'Violet Diaz','https://api.dicebear.com/7.x/avataaars/svg?seed=324848776302821376',2,'',NULL,NULL,NULL,0,'2026-06-15 17:53:04',0,'2026-06-15 17:53:04',0),(324848840190459904,322576880446210048,'2052',NULL,'Grayson Carter','https://api.dicebear.com/7.x/avataaars/svg?seed=324848840190459904',2,'',NULL,NULL,NULL,0,'2026-06-15 17:53:19',0,'2026-06-15 17:53:19',0),(324849356769329152,322576880446210048,'2053',NULL,'David Jenkins','https://api.dicebear.com/7.x/avataaars/svg?seed=324849356769329152',2,'',NULL,NULL,NULL,0,'2026-06-15 17:55:22',0,'2026-06-15 17:55:22',0),(324849433583812608,322576880446210048,'2054',NULL,'Levi Torres','https://api.dicebear.com/7.x/avataaars/svg?seed=324849433583812608',2,'',NULL,NULL,NULL,0,'2026-06-15 17:55:40',0,'2026-06-15 17:55:40',0),(324849984065241088,322576880446210048,'2055',NULL,'Ava Richardson','https://api.dicebear.com/7.x/avataaars/svg?seed=324849984065241088',2,'',NULL,NULL,NULL,0,'2026-06-15 17:57:52',0,'2026-06-15 17:57:52',0),(324850078202200064,322576880446210048,'2056',NULL,'Charles Martin','https://api.dicebear.com/7.x/avataaars/svg?seed=324850078202200064',2,'',NULL,NULL,NULL,0,'2026-06-15 17:58:14',0,'2026-06-15 17:58:14',0),(324850800515874816,322576880446210048,'2057',NULL,'Naomi White','https://api.dicebear.com/7.x/avataaars/svg?seed=324850800515874816',2,'',NULL,NULL,NULL,0,'2026-06-15 18:01:06',0,'2026-06-15 18:01:06',0),(324850826092740608,322576880446210048,'2058',NULL,'Henry King','https://api.dicebear.com/7.x/avataaars/svg?seed=324850826092740608',2,'',NULL,NULL,NULL,0,'2026-06-15 18:01:12',0,'2026-06-15 18:01:12',0),(324850937912885248,322576880446210048,'2059',NULL,'Daniel Sanders','https://api.dicebear.com/7.x/avataaars/svg?seed=324850937912885248',2,'',NULL,NULL,NULL,0,'2026-06-15 18:01:39',0,'2026-06-15 18:01:39',0),(324850972327149568,322576880446210048,'2060',NULL,'Dylan Miller','https://api.dicebear.com/7.x/avataaars/svg?seed=324850972327149568',2,'',NULL,NULL,NULL,0,'2026-06-15 18:01:47',0,'2026-06-15 18:01:47',0),(324851051523997696,322576880446210048,'2061',NULL,'Maya Ramirez','https://api.dicebear.com/7.x/avataaars/svg?seed=324851051523997696',2,'',NULL,NULL,NULL,0,'2026-06-15 18:02:06',0,'2026-06-15 18:02:06',0),(324851081890758656,322576880446210048,'2062',NULL,'Mila Scott','https://api.dicebear.com/7.x/avataaars/svg?seed=324851081890758656',2,'',NULL,NULL,NULL,0,'2026-06-15 18:02:13',0,'2026-06-15 18:02:13',0),(324852928714113024,322576880446210048,'2063',NULL,'Naomi Cox','https://api.dicebear.com/7.x/avataaars/svg?seed=324852928714113024',2,'',NULL,NULL,NULL,0,'2026-06-15 18:09:34',0,'2026-06-15 18:09:34',0),(324853018820345856,322576880446210048,'2064',NULL,'Aiden Ward','https://api.dicebear.com/7.x/avataaars/svg?seed=324853018820345856',2,'',NULL,NULL,NULL,0,'2026-06-15 18:09:55',0,'2026-06-15 18:09:55',0),(324853099854299136,322576880446210048,'2065',NULL,'Zona King','https://api.dicebear.com/7.x/avataaars/svg?seed=324853099854299136',2,'',NULL,NULL,NULL,0,'2026-06-15 18:10:14',0,'2026-06-15 18:10:14',0),(324853138500616192,322576880446210048,'2066',NULL,'Grayson Jackson','https://api.dicebear.com/7.x/avataaars/svg?seed=324853138500616192',2,'',NULL,NULL,NULL,0,'2026-06-15 18:10:24',0,'2026-06-15 18:10:24',0),(324854346044932096,322576880446210048,'2067',NULL,'Luke Harris','https://api.dicebear.com/7.x/avataaars/svg?seed=324854346044932096',2,'',NULL,NULL,NULL,0,'2026-06-15 18:15:12',0,'2026-06-15 18:15:12',0),(324854418031771648,322576880446210048,'2068',NULL,'Luna Edwards','https://api.dicebear.com/7.x/avataaars/svg?seed=324854418031771648',2,'',NULL,NULL,NULL,0,'2026-06-15 18:15:29',0,'2026-06-15 18:15:29',0),(324854800023814144,322576880446210048,'2069',NULL,'Logan Edwards','https://api.dicebear.com/7.x/avataaars/svg?seed=324854800023814144',2,'',NULL,NULL,NULL,0,'2026-06-15 18:17:00',0,'2026-06-15 18:17:00',0),(324854864297328640,322576880446210048,'2070',NULL,'Theodore Anderson','https://api.dicebear.com/7.x/avataaars/svg?seed=324854864297328640',2,'',NULL,NULL,NULL,0,'2026-06-15 18:17:15',0,'2026-06-15 18:17:15',0),(324856062391877632,322576880446210048,'2071',NULL,'Aria Russell','https://api.dicebear.com/7.x/avataaars/svg?seed=324856062391877632',2,'',NULL,NULL,NULL,0,'2026-06-15 18:22:01',0,'2026-06-15 18:22:01',0),(324856133233672192,322576880446210048,'2072',NULL,'James Phillips','https://api.dicebear.com/7.x/avataaars/svg?seed=324856133233672192',2,'',NULL,NULL,NULL,0,'2026-06-15 18:22:18',0,'2026-06-15 18:22:18',0),(324856404118601728,322576880446210048,'2073',NULL,'Wyatt Walker','https://api.dicebear.com/7.x/avataaars/svg?seed=324856404118601728',2,'',NULL,NULL,NULL,0,'2026-06-15 18:23:22',0,'2026-06-15 18:23:22',0),(324856460401967104,322576880446210048,'2074',NULL,'Elijah Cox','https://api.dicebear.com/7.x/avataaars/svg?seed=324856460401967104',2,'',NULL,NULL,NULL,0,'2026-06-15 18:23:36',0,'2026-06-15 18:23:36',0),(324857874155044864,322576880446210048,'2075',NULL,'Elias Cox','https://api.dicebear.com/7.x/avataaars/svg?seed=324857874155044864',2,'',NULL,NULL,NULL,0,'2026-06-15 18:29:13',0,'2026-06-15 18:29:13',0),(324857920577601536,322576880446210048,'2076',NULL,'Chloe Wood','https://api.dicebear.com/7.x/avataaars/svg?seed=324857920577601536',2,'',NULL,NULL,NULL,0,'2026-06-15 18:29:24',0,'2026-06-15 18:29:24',0),(324859357562929152,322576880446210048,'2077',NULL,'Chloe Baker','https://api.dicebear.com/7.x/avataaars/svg?seed=324859357562929152',2,'',NULL,NULL,NULL,0,'2026-06-15 18:35:06',0,'2026-06-15 18:35:06',0),(324859385610240000,322576880446210048,'2078',NULL,'Zoe Carter','https://api.dicebear.com/7.x/avataaars/svg?seed=324859385610240000',2,'',NULL,NULL,NULL,0,'2026-06-15 18:35:13',0,'2026-06-15 18:35:13',0),(324859446733832192,322576880446210048,'2079',NULL,'Violet Anderson','https://api.dicebear.com/7.x/avataaars/svg?seed=324859446733832192',2,'',NULL,NULL,NULL,0,'2026-06-15 18:35:28',0,'2026-06-15 18:35:28',0),(324859491046653952,322576880446210048,'2080',NULL,'Maverick Walker','https://api.dicebear.com/7.x/avataaars/svg?seed=324859491046653952',2,'',NULL,NULL,NULL,0,'2026-06-15 18:35:38',0,'2026-06-15 18:35:38',0),(324859551755010048,322576880446210048,'2081',NULL,'Chloe Green','https://api.dicebear.com/7.x/avataaars/svg?seed=324859551755010048',2,'',NULL,NULL,NULL,0,'2026-06-15 18:35:53',0,'2026-06-15 18:35:53',0),(324859600689954816,322576880446210048,'2082',NULL,'James Evans','https://api.dicebear.com/7.x/avataaars/svg?seed=324859600689954816',2,'',NULL,NULL,NULL,0,'2026-06-15 18:36:04',0,'2026-06-15 18:36:04',0),(324861906894454784,322576880446210048,'2083',NULL,'Ella Murphy','https://api.dicebear.com/7.x/avataaars/svg?seed=324861906894454784',2,'',NULL,NULL,NULL,0,'2026-06-15 18:45:14',0,'2026-06-15 18:45:14',0),(324861945494634496,322576880446210048,'2084',NULL,'Carter Harris','https://api.dicebear.com/7.x/avataaars/svg?seed=324861945494634496',2,'',NULL,NULL,NULL,0,'2026-06-15 18:45:23',0,'2026-06-15 18:45:23',0),(325117514344300544,322576880446210048,'00',NULL,'Ivy Parker','https://api.dicebear.com/7.x/avataaars/svg?seed=325117514344300544',2,'',NULL,NULL,NULL,0,'2026-06-16 11:40:56',0,'2026-06-16 11:40:56',0),(325121651190530048,322576880446210048,'001',NULL,'Willow Allen','https://api.dicebear.com/7.x/avataaars/svg?seed=325121651190530048',2,'en_US',NULL,NULL,NULL,0,'2026-06-16 11:57:22',0,'2026-06-16 11:57:22',0),(325122433742798848,322576880446210048,'002',NULL,'Mia Thomas','https://api.dicebear.com/7.x/avataaars/svg?seed=325122433742798848',2,'en_US',NULL,NULL,NULL,0,'2026-06-16 12:00:29',0,'2026-06-16 12:00:29',0),(325123746018885632,322576880446210048,'003',NULL,'Charlotte Perez','https://api.dicebear.com/7.x/avataaars/svg?seed=325123746018885632',2,'en_US',NULL,NULL,NULL,0,'2026-06-16 12:05:42',0,'2026-06-16 12:05:42',0),(325875028673429504,322576880446210048,'1002',NULL,'Sebastian Lopez','https://api.dicebear.com/7.x/avataaars/svg?seed=325875028673429504',2,'en_US',NULL,NULL,NULL,0,'2026-06-18 13:51:01',0,'2026-06-18 13:51:01',0);
/*!40000 ALTER TABLE `cus_customer` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `id_account`
--

DROP TABLE IF EXISTS `id_account`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `id_account` (
  `id` bigint NOT NULL COMMENT '主键(雪花ID)',
  `email` varchar(128) COLLATE utf8mb4_general_ci NOT NULL COMMENT '邮箱(登录名,收验证码)',
  `username` varchar(64) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '用户名(账号显示名,可改)',
  `invite_code` varchar(16) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '邀请码(注册裂变码,全局唯一)',
  `inviter_account_id` bigint DEFAULT NULL COMMENT '邀请人账号id(注册时所填邀请码归属)',
  `password_hash` varchar(128) COLLATE utf8mb4_general_ci NOT NULL COMMENT '密码哈希',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '状态 1正常 0禁用',
  `create_by` bigint DEFAULT NULL COMMENT '创建者',
  `create_time` datetime DEFAULT NULL COMMENT '创建时间',
  `update_by` bigint DEFAULT NULL COMMENT '更新者',
  `update_time` datetime DEFAULT NULL COMMENT '更新时间',
  `del_flag` tinyint NOT NULL DEFAULT '0' COMMENT '删除标志 0存在 1删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_email` (`email`),
  UNIQUE KEY `uk_invite_code` (`invite_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='租户账号(坐席侧登录)';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `id_account`
--

LOCK TABLES `id_account` WRITE;
/*!40000 ALTER TABLE `id_account` DISABLE KEYS */;
INSERT INTO `id_account` VALUES (322576879066284032,'neganpub@gmail.com','negan','CA3DB01C',NULL,'$2a$10$XSLXxI6ljBqfgQfnWiiYTuaZXMqI//iZclIonjCbmMLTqgqls71Me',1,0,'2026-06-09 11:25:21',0,'2026-06-09 11:25:21',0),(322580516861640704,'a@qq.com','a','C2A0B7FB',NULL,'$2a$10$50FDX1rTGScP8BWl9l4R6exxN2tOqQuYgJVmFTtah5LqV/EeDCpjq',1,0,'2026-06-09 11:39:49',1,'2026-06-10 11:25:51',0);
/*!40000 ALTER TABLE `id_account` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `id_invite`
--

DROP TABLE IF EXISTS `id_invite`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `id_invite` (
  `id` bigint NOT NULL COMMENT '主键(雪花ID)',
  `project_id` bigint NOT NULL COMMENT '项目id',
  `email` varchar(128) COLLATE utf8mb4_general_ci NOT NULL COMMENT '被邀请邮箱',
  `token` varchar(64) COLLATE utf8mb4_general_ci NOT NULL COMMENT '邀请token',
  `role_id` bigint NOT NULL COMMENT '赋予角色id',
  `status` tinyint NOT NULL DEFAULT '0' COMMENT '状态 0待接受 1已接受 2已撤销 3已过期',
  `send_count` int NOT NULL DEFAULT '1' COMMENT '邀请发送次数(再次邀请累加)',
  `inviter_member_id` bigint DEFAULT NULL COMMENT '邀请人成员id',
  `accepted_member_id` bigint DEFAULT NULL COMMENT '接受后生成的成员id',
  `expire_time` datetime DEFAULT NULL COMMENT '过期时间(72h)',
  `create_by` bigint DEFAULT NULL COMMENT '创建者',
  `create_time` datetime DEFAULT NULL COMMENT '创建时间',
  `update_by` bigint DEFAULT NULL COMMENT '更新者',
  `update_time` datetime DEFAULT NULL COMMENT '更新时间',
  `del_flag` tinyint NOT NULL DEFAULT '0' COMMENT '删除标志 0存在 1删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_token` (`token`),
  KEY `idx_project` (`project_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='邮箱邀请';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `id_invite`
--

LOCK TABLES `id_invite` WRITE;
/*!40000 ALTER TABLE `id_invite` DISABLE KEYS */;
INSERT INTO `id_invite` VALUES (324723629340229632,322576880446210048,'a@qq.com','aZSrNWYf5fVi95isVD4LYgiJw2bJ3cVngnGF3tDy',322576880525901824,1,2,322576880534290432,324736000578289664,'2026-06-18 12:33:44',322576880534290432,'2026-06-15 09:35:46',322576880534290432,'2026-06-15 09:35:46',0);
/*!40000 ALTER TABLE `id_invite` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `id_invite_link`
--

DROP TABLE IF EXISTS `id_invite_link`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `id_invite_link` (
  `id` bigint NOT NULL COMMENT '主键(雪花ID)',
  `project_id` bigint NOT NULL COMMENT '项目id',
  `token` varchar(64) COLLATE utf8mb4_general_ci NOT NULL COMMENT '链接token',
  `role_id` bigint NOT NULL COMMENT '赋予角色id',
  `access_type` tinyint NOT NULL DEFAULT '0' COMMENT '邀请形式 0公开(任何人可加入) 1私密(需验证码)',
  `access_code` varchar(16) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '私密链接的访问验证码',
  `join_count` int NOT NULL DEFAULT '0' COMMENT '通过该链接加入的人数',
  `disabled` tinyint NOT NULL DEFAULT '0' COMMENT '是否禁用 1是',
  `inviter_member_id` bigint DEFAULT NULL COMMENT '创建人成员id',
  `expire_time` datetime DEFAULT NULL COMMENT '过期时间(72h)',
  `create_by` bigint DEFAULT NULL COMMENT '创建者',
  `create_time` datetime DEFAULT NULL COMMENT '创建时间',
  `update_by` bigint DEFAULT NULL COMMENT '更新者',
  `update_time` datetime DEFAULT NULL COMMENT '更新时间',
  `del_flag` tinyint NOT NULL DEFAULT '0' COMMENT '删除标志 0存在 1删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_token` (`token`),
  KEY `idx_project` (`project_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='链接邀请';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `id_invite_link`
--

LOCK TABLES `id_invite_link` WRITE;
/*!40000 ALTER TABLE `id_invite_link` DISABLE KEYS */;
/*!40000 ALTER TABLE `id_invite_link` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `id_member`
--

DROP TABLE IF EXISTS `id_member`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `id_member` (
  `id` bigint NOT NULL COMMENT '主键(雪花ID)',
  `project_id` bigint NOT NULL COMMENT '项目id',
  `account_id` bigint NOT NULL COMMENT '账号id',
  `role_id` bigint NOT NULL COMMENT '角色id',
  `nickname` varchar(64) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '成员昵称(单一真相)',
  `avatar` varchar(256) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '头像',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '状态 1启用 0禁用',
  `online_status` tinyint NOT NULL DEFAULT '0' COMMENT '在线状态 1在线 0离线',
  `work_status` tinyint NOT NULL DEFAULT '0' COMMENT '工作状态(参与分配前提) 1可接 0离开',
  `language` varchar(16) COLLATE utf8mb4_general_ci DEFAULT 'zh_CN' COMMENT '个人系统语言(简中/英文)',
  `sound_enabled` tinyint NOT NULL DEFAULT '1' COMMENT '消息音效 1开 0关',
  `push_enabled` tinyint NOT NULL DEFAULT '1' COMMENT '系统推送(web/app) 1开 0关',
  `create_by` bigint DEFAULT NULL COMMENT '创建者',
  `create_time` datetime DEFAULT NULL COMMENT '创建时间',
  `update_by` bigint DEFAULT NULL COMMENT '更新者',
  `update_time` datetime DEFAULT NULL COMMENT '更新时间',
  `del_flag` tinyint NOT NULL DEFAULT '0' COMMENT '删除标志 0存在 1删除',
  `push_assigned_app` tinyint NOT NULL DEFAULT '1' COMMENT '推送-分配给我的会话客户消息(APP)',
  `push_assigned_web` tinyint NOT NULL DEFAULT '1' COMMENT '推送-分配给我的会话客户消息(Web)',
  `push_unassigned_app` tinyint NOT NULL DEFAULT '1' COMMENT '推送-未分配会话客户消息(APP)',
  `push_unassigned_web` tinyint NOT NULL DEFAULT '1' COMMENT '推送-未分配会话客户消息(Web)',
  `push_mention_app` tinyint NOT NULL DEFAULT '1' COMMENT '推送-提到我的消息(APP)',
  `push_mention_web` tinyint NOT NULL DEFAULT '1' COMMENT '推送-提到我的消息(Web)',
  `push_new_customer_app` tinyint NOT NULL DEFAULT '0' COMMENT '推送-新客户提醒(APP)',
  `push_new_customer_web` tinyint NOT NULL DEFAULT '1' COMMENT '推送-新客户提醒(Web)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_project_account` (`project_id`,`account_id`),
  KEY `idx_project` (`project_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='成员(坐席)';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `id_member`
--

LOCK TABLES `id_member` WRITE;
/*!40000 ALTER TABLE `id_member` DISABLE KEYS */;
INSERT INTO `id_member` VALUES (322576880534290432,322576880446210048,322576879066284032,322576880496541696,'Negan-01','http://localhost:9000/aitalky/2026/06/09/eef6f4fed79348e29f35e17995054b7c.jpg',1,0,1,'zh_CN',1,1,322576879066284032,'2026-06-09 11:25:22',322576879066284032,'2026-06-15 11:12:52',0,1,1,1,1,1,1,1,1),(322580673720221696,322580673657307136,322580516861640704,322580673690861568,'alan',NULL,1,0,1,'zh_CN',1,1,322580516861640704,'2026-06-09 11:40:26',322580516861640704,'2026-06-15 11:12:52',0,1,1,1,1,1,1,0,1),(323748066551136256,323748066425307136,322576879066284032,323748066530164736,'neganpub',NULL,1,0,1,'zh_CN',1,1,322576880534290432,'2026-06-12 16:59:14',322576880534290432,'2026-06-15 11:12:52',0,1,1,1,1,1,1,0,1),(323754887873560576,323754887592542208,322576879066284032,323754887840006144,'客服','https://api.dicebear.com/9.x/avataaars/svg?seed=323754887873560576',1,0,1,'zh_CN',1,1,323748066551136256,'2026-06-12 17:26:20',323748066551136256,'2026-06-15 11:12:52',0,1,1,1,1,1,1,0,1),(324736000578289664,322576880446210048,322580516861640704,322576880525901824,'peter999','https://api.dicebear.com/9.x/avataaars/svg?seed=324736000578289664',1,0,1,'zh_CN',1,1,322580516861640704,'2026-06-15 10:24:56',324736000578289664,'2026-06-15 13:42:54',0,1,1,1,1,1,1,0,1),(325856634532265984,325856634427408384,322576879066284032,325856634494517248,'hhhh','https://api.dicebear.com/9.x/avataaars/svg?seed=325856634532265984',1,0,1,'zh_CN',1,1,322576880534290432,'2026-06-18 12:37:56',322576880534290432,'2026-06-18 12:37:56',0,1,1,1,1,1,1,0,1);
/*!40000 ALTER TABLE `id_member` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `id_project`
--

DROP TABLE IF EXISTS `id_project`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `id_project` (
  `id` bigint NOT NULL COMMENT '主键(雪花ID)',
  `name` varchar(64) COLLATE utf8mb4_general_ci NOT NULL COMMENT '项目名称',
  `logo` varchar(256) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '项目 Logo(对象存储URL)',
  `app_id` varchar(32) COLLATE utf8mb4_general_ci NOT NULL COMMENT '对外接入标识 appId',
  `app_secret` varchar(64) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'SDK 密钥',
  `owner_account_id` bigint NOT NULL COMMENT '所有者(负责人)账号id',
  `site` varchar(16) COLLATE utf8mb4_general_ci DEFAULT 'cn' COMMENT '站点 cn中国站/intl国际站',
  `is_private` tinyint NOT NULL DEFAULT '0' COMMENT '是否专有云(私有化)',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '状态 1正常 0停用',
  `create_by` bigint DEFAULT NULL COMMENT '创建者',
  `create_time` datetime DEFAULT NULL COMMENT '创建时间',
  `update_by` bigint DEFAULT NULL COMMENT '更新者',
  `update_time` datetime DEFAULT NULL COMMENT '更新时间',
  `del_flag` tinyint NOT NULL DEFAULT '0' COMMENT '删除标志 0存在 1删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_app_id` (`app_id`),
  KEY `idx_owner` (`owner_account_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='项目(租户)';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `id_project`
--

LOCK TABLES `id_project` WRITE;
/*!40000 ALTER TABLE `id_project` DISABLE KEYS */;
INSERT INTO `id_project` VALUES (322576880446210048,'短剧','http://localhost:9000/aitalky/2026/06/12/91971f52a63e4ab0b8ed03d19b206ae4.jpg','BkbMV3jWNx',NULL,322576879066284032,'cn',0,1,322576879066284032,'2026-06-09 11:25:21',1,'2026-06-12 16:31:25',0),(322580673657307136,'aaa的项目',NULL,'kA4YZDwb4C',NULL,322580516861640704,'cn',0,1,322580516861640704,'2026-06-09 11:40:26',322580516861640704,'2026-06-09 11:40:26',0),(323748066425307136,'交易所','http://localhost:9000/aitalky/2026/06/12/07d287f80a604d9ca298fc3adf8c9b9d.jpg','QYpszrbfuk',NULL,322576879066284032,'cn',0,1,322576880534290432,'2026-06-12 16:59:14',322576880534290432,'2026-06-12 16:59:14',0),(323754887592542208,'客服','http://localhost:9000/aitalky/2026/06/12/72d113e099ba435c9beb4c1d517f7e98.jpg','uWQHpwVCKi',NULL,322576879066284032,'cn',0,1,323748066551136256,'2026-06-12 17:26:20',323748066551136256,'2026-06-12 17:26:20',0),(325856634427408384,'hhhh',NULL,'hnpbLJq3X3',NULL,322576879066284032,'cn',0,1,322576880534290432,'2026-06-18 12:37:56',322576880534290432,'2026-06-18 12:37:56',0);
/*!40000 ALTER TABLE `id_project` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `id_role`
--

DROP TABLE IF EXISTS `id_role`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `id_role` (
  `id` bigint NOT NULL COMMENT '主键(雪花ID)',
  `project_id` bigint NOT NULL COMMENT '项目id',
  `name` varchar(32) COLLATE utf8mb4_general_ci NOT NULL COMMENT '角色名称',
  `is_system` tinyint NOT NULL DEFAULT '0' COMMENT '是否预置(名/权限不可改) 1是',
  `permissions` json DEFAULT NULL COMMENT '权限 {"pages":[...],"functions":[...]} 含收件箱视图(all/unassigned)等',
  `create_by` bigint DEFAULT NULL COMMENT '创建者',
  `create_time` datetime DEFAULT NULL COMMENT '创建时间',
  `update_by` bigint DEFAULT NULL COMMENT '更新者',
  `update_time` datetime DEFAULT NULL COMMENT '更新时间',
  `del_flag` tinyint NOT NULL DEFAULT '0' COMMENT '删除标志 0存在 1删除',
  PRIMARY KEY (`id`),
  KEY `idx_project` (`project_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='角色';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `id_role`
--

LOCK TABLES `id_role` WRITE;
/*!40000 ALTER TABLE `id_role` DISABLE KEYS */;
INSERT INTO `id_role` VALUES (322576880496541696,322576880446210048,'负责人',1,'{\"pages\": [\"inbox\", \"customers\", \"statistics\", \"settings\", \"inbox.digitalEmployee\"], \"functions\": [\"inbox.viewAll\", \"inbox.viewUnassigned\", \"conversation.send\", \"conversation.withdraw\", \"conversation.transfer\", \"conversation.close\", \"conversation.blacklist\", \"member.manage\", \"role.manage\", \"messenger.setting\", \"assign.setting\", \"group.manage\", \"quickreply.manage\", \"blacklist.manage\", \"project.setting\", \"billing.manage\", \"inbox.search\"]}',322576879066284032,'2026-06-09 11:25:21',322576879066284032,'2026-06-15 12:55:02',0),(322576880517513216,322576880446210048,'管理员',1,'{\"pages\": [\"inbox\", \"customers\", \"statistics\", \"settings\", \"inbox.digitalEmployee\"], \"functions\": [\"inbox.viewAll\", \"inbox.viewUnassigned\", \"conversation.send\", \"conversation.withdraw\", \"conversation.transfer\", \"conversation.close\", \"conversation.blacklist\", \"member.manage\", \"role.manage\", \"messenger.setting\", \"assign.setting\", \"group.manage\", \"quickreply.manage\", \"blacklist.manage\", \"project.setting\", \"inbox.search\"]}',322576879066284032,'2026-06-09 11:25:22',322576879066284032,'2026-06-15 12:55:02',0),(322576880525901824,322576880446210048,'普通成员',1,'{\"pages\": [\"inbox\", \"customers\"], \"functions\": [\"conversation.send\", \"conversation.withdraw\", \"conversation.close\", \"inbox.search\", \"inbox.viewAll\", \"inbox.viewUnassigned\"]}',322576879066284032,'2026-06-09 11:25:22',322576879066284032,'2026-06-15 12:55:02',0),(322580673690861568,322580673657307136,'负责人',1,'{\"pages\": [\"inbox\", \"customers\", \"statistics\", \"settings\", \"inbox.digitalEmployee\"], \"functions\": [\"inbox.viewAll\", \"inbox.viewUnassigned\", \"conversation.send\", \"conversation.withdraw\", \"conversation.transfer\", \"conversation.close\", \"conversation.blacklist\", \"member.manage\", \"role.manage\", \"messenger.setting\", \"assign.setting\", \"group.manage\", \"quickreply.manage\", \"blacklist.manage\", \"project.setting\", \"billing.manage\", \"inbox.search\"]}',322580516861640704,'2026-06-09 11:40:26',322580516861640704,'2026-06-15 12:55:02',0),(322580673703444480,322580673657307136,'管理员',1,'{\"pages\": [\"inbox\", \"customers\", \"statistics\", \"settings\", \"inbox.digitalEmployee\"], \"functions\": [\"inbox.viewAll\", \"inbox.viewUnassigned\", \"conversation.send\", \"conversation.withdraw\", \"conversation.transfer\", \"conversation.close\", \"conversation.blacklist\", \"member.manage\", \"role.manage\", \"messenger.setting\", \"assign.setting\", \"group.manage\", \"quickreply.manage\", \"blacklist.manage\", \"project.setting\", \"inbox.search\"]}',322580516861640704,'2026-06-09 11:40:26',322580516861640704,'2026-06-15 12:55:02',0),(322580673711833088,322580673657307136,'普通成员',1,'{\"pages\": [\"inbox\", \"customers\"], \"functions\": [\"conversation.send\", \"conversation.withdraw\", \"conversation.close\", \"inbox.search\", \"inbox.viewAll\", \"inbox.viewUnassigned\"]}',322580516861640704,'2026-06-09 11:40:26',322580516861640704,'2026-06-15 12:55:02',0),(323748066530164736,323748066425307136,'负责人',1,'{\"pages\": [\"inbox\", \"customers\", \"statistics\", \"settings\", \"inbox.digitalEmployee\"], \"functions\": [\"inbox.viewAll\", \"inbox.viewUnassigned\", \"conversation.send\", \"conversation.withdraw\", \"conversation.transfer\", \"conversation.close\", \"conversation.blacklist\", \"member.manage\", \"role.manage\", \"messenger.setting\", \"assign.setting\", \"group.manage\", \"quickreply.manage\", \"blacklist.manage\", \"project.setting\", \"billing.manage\", \"inbox.search\"]}',322576880534290432,'2026-06-12 16:59:14',322576880534290432,'2026-06-15 12:55:02',0),(323748066538553344,323748066425307136,'管理员',1,'{\"pages\": [\"inbox\", \"customers\", \"statistics\", \"settings\", \"inbox.digitalEmployee\"], \"functions\": [\"inbox.viewAll\", \"inbox.viewUnassigned\", \"conversation.send\", \"conversation.withdraw\", \"conversation.transfer\", \"conversation.close\", \"conversation.blacklist\", \"member.manage\", \"role.manage\", \"messenger.setting\", \"assign.setting\", \"group.manage\", \"quickreply.manage\", \"blacklist.manage\", \"project.setting\", \"inbox.search\"]}',322576880534290432,'2026-06-12 16:59:14',322576880534290432,'2026-06-15 12:55:02',0),(323748066542747648,323748066425307136,'普通成员',1,'{\"pages\": [\"inbox\", \"customers\"], \"functions\": [\"conversation.send\", \"conversation.withdraw\", \"conversation.close\", \"inbox.search\", \"inbox.viewAll\", \"inbox.viewUnassigned\"]}',322576880534290432,'2026-06-12 16:59:14',322576880534290432,'2026-06-15 12:55:02',0),(323754887840006144,323754887592542208,'负责人',1,'{\"pages\": [\"inbox\", \"customers\", \"statistics\", \"settings\", \"inbox.digitalEmployee\"], \"functions\": [\"inbox.viewAll\", \"inbox.viewUnassigned\", \"conversation.send\", \"conversation.withdraw\", \"conversation.transfer\", \"conversation.close\", \"conversation.blacklist\", \"member.manage\", \"role.manage\", \"messenger.setting\", \"assign.setting\", \"group.manage\", \"quickreply.manage\", \"blacklist.manage\", \"project.setting\", \"billing.manage\", \"inbox.search\"]}',323748066551136256,'2026-06-12 17:26:20',323748066551136256,'2026-06-15 12:55:02',0),(323754887856783360,323754887592542208,'管理员',1,'{\"pages\": [\"inbox\", \"customers\", \"statistics\", \"settings\", \"inbox.digitalEmployee\"], \"functions\": [\"inbox.viewAll\", \"inbox.viewUnassigned\", \"conversation.send\", \"conversation.withdraw\", \"conversation.transfer\", \"conversation.close\", \"conversation.blacklist\", \"member.manage\", \"role.manage\", \"messenger.setting\", \"assign.setting\", \"group.manage\", \"quickreply.manage\", \"blacklist.manage\", \"project.setting\", \"inbox.search\"]}',323748066551136256,'2026-06-12 17:26:20',323748066551136256,'2026-06-15 12:55:02',0),(323754887865171968,323754887592542208,'普通成员',1,'{\"pages\": [\"inbox\", \"customers\"], \"functions\": [\"conversation.send\", \"conversation.withdraw\", \"conversation.close\", \"inbox.search\", \"inbox.viewAll\", \"inbox.viewUnassigned\"]}',323748066551136256,'2026-06-12 17:26:20',323748066551136256,'2026-06-15 12:55:02',0),(324774740805812224,322576880446210048,'金牌客服',0,'{\"pages\": [\"inbox.digitalEmployee\"], \"functions\": [\"inbox.viewAll\", \"inbox.viewUnassigned\", \"inbox.search\"]}',322576880534290432,'2026-06-15 12:58:52',322576880534290432,'2026-06-15 12:58:52',0),(325856634494517248,325856634427408384,'负责人',1,'{\"pages\": [\"inbox\", \"inbox.digitalEmployee\", \"customers\", \"statistics\", \"settings\"], \"functions\": [\"inbox.viewAll\", \"inbox.viewUnassigned\", \"inbox.search\", \"conversation.send\", \"conversation.withdraw\", \"conversation.transfer\", \"conversation.close\", \"conversation.blacklist\", \"member.manage\", \"role.manage\", \"messenger.setting\", \"assign.setting\", \"group.manage\", \"quickreply.manage\", \"blacklist.manage\", \"project.setting\", \"billing.manage\"]}',322576880534290432,'2026-06-18 12:37:56',322576880534290432,'2026-06-18 12:37:56',0),(325856634519683072,325856634427408384,'管理员',1,'{\"pages\": [\"inbox\", \"inbox.digitalEmployee\", \"customers\", \"statistics\", \"settings\"], \"functions\": [\"inbox.viewAll\", \"inbox.viewUnassigned\", \"inbox.search\", \"conversation.send\", \"conversation.withdraw\", \"conversation.transfer\", \"conversation.close\", \"conversation.blacklist\", \"member.manage\", \"role.manage\", \"messenger.setting\", \"assign.setting\", \"group.manage\", \"quickreply.manage\", \"blacklist.manage\", \"project.setting\"]}',322576880534290432,'2026-06-18 12:37:56',322576880534290432,'2026-06-18 12:37:56',0),(325856634523877376,325856634427408384,'普通成员',1,'{\"pages\": [\"inbox\", \"customers\"], \"functions\": [\"inbox.viewAll\", \"inbox.viewUnassigned\", \"inbox.search\", \"conversation.send\", \"conversation.withdraw\", \"conversation.close\"]}',322576880534290432,'2026-06-18 12:37:56',322576880534290432,'2026-06-18 12:37:56',0);
/*!40000 ALTER TABLE `id_role` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `mse_messenger`
--

DROP TABLE IF EXISTS `mse_messenger`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mse_messenger` (
  `id` bigint NOT NULL COMMENT '主键(雪花ID)',
  `project_id` bigint NOT NULL COMMENT '项目id',
  `brand_name` varchar(64) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '品牌名(信使端显示)',
  `logo` varchar(256) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'LOGO',
  `custom_domain` varchar(128) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '自定义域名',
  `badge` varchar(256) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '信使角标',
  `web_title` varchar(64) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '网站标题(URL接入,浏览器标签页)',
  `web_icon` varchar(256) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '网站图标 favicon(ico,URL接入)',
  `launcher_config` json DEFAULT NULL COMMENT '启动器/角标样式(圆形按钮|侧边栏 + PC/移动端 图标/位置/大小/边距等)',
  `default_language` varchar(16) COLLATE utf8mb4_general_ci DEFAULT 'zh_CN' COMMENT '默认语言',
  `enabled_languages` json DEFAULT NULL COMMENT '启用语种(默认含zh_CN,en_US)',
  `reply_time` varchar(32) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '团队回复时间预期',
  `message_retention_days` int NOT NULL DEFAULT '0' COMMENT '信使端消息保存天数 0无限',
  `popup_enabled` tinyint NOT NULL DEFAULT '1' COMMENT '弹窗提醒 1开 0关(红点/声效恒开)',
  `popup_allow_close` tinyint NOT NULL DEFAULT '1' COMMENT '是否允许客户关闭弹窗 1是',
  `sys_msg_unread` tinyint NOT NULL DEFAULT '1' COMMENT '系统消息-未读 1显示 0隐藏',
  `sys_msg_typing` tinyint NOT NULL DEFAULT '1' COMMENT '系统消息-正在输入中 1显示 0隐藏',
  `sys_msg_member_retract` tinyint NOT NULL DEFAULT '1' COMMENT '系统消息-成员撤回消息 1显示 0隐藏',
  `customer_retract_enabled` tinyint NOT NULL DEFAULT '1' COMMENT '客户撤回消息权限 1允许 0禁止',
  `create_by` bigint DEFAULT NULL COMMENT '创建者',
  `create_time` datetime DEFAULT NULL COMMENT '创建时间',
  `update_by` bigint DEFAULT NULL COMMENT '更新者',
  `update_time` datetime DEFAULT NULL COMMENT '更新时间',
  `del_flag` tinyint NOT NULL DEFAULT '0' COMMENT '删除标志 0存在 1删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_project` (`project_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='信使配置';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `mse_messenger`
--

LOCK TABLES `mse_messenger` WRITE;
/*!40000 ALTER TABLE `mse_messenger` DISABLE KEYS */;
INSERT INTO `mse_messenger` VALUES (322996861981949952,322576880446210048,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'zh_CN',NULL,NULL,0,1,1,1,1,1,1,322576880534290432,'2026-06-10 15:14:13',322576880534290432,'2026-06-10 15:14:13',0);
/*!40000 ALTER TABLE `mse_messenger` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `mse_messenger_i18n`
--

DROP TABLE IF EXISTS `mse_messenger_i18n`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mse_messenger_i18n` (
  `id` bigint NOT NULL COMMENT '主键(雪花ID)',
  `project_id` bigint NOT NULL COMMENT '项目id',
  `language` varchar(16) COLLATE utf8mb4_general_ci NOT NULL COMMENT '语言',
  `greeting` varchar(512) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '问候语',
  `team_intro` varchar(512) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '团队介绍',
  `urgent_notice` varchar(512) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '紧急通知内容',
  `urgent_enabled` tinyint NOT NULL DEFAULT '0' COMMENT '紧急通知是否开启',
  `create_by` bigint DEFAULT NULL COMMENT '创建者',
  `create_time` datetime DEFAULT NULL COMMENT '创建时间',
  `update_by` bigint DEFAULT NULL COMMENT '更新者',
  `update_time` datetime DEFAULT NULL COMMENT '更新时间',
  `del_flag` tinyint NOT NULL DEFAULT '0' COMMENT '删除标志 0存在 1删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_project_lang` (`project_id`,`language`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='信使多语言内容';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `mse_messenger_i18n`
--

LOCK TABLES `mse_messenger_i18n` WRITE;
/*!40000 ALTER TABLE `mse_messenger_i18n` DISABLE KEYS */;
INSERT INTO `mse_messenger_i18n` VALUES (322996965619007488,322576880446210048,'de_DE',NULL,NULL,NULL,1,322576880534290432,'2026-06-10 15:14:38',322576880534290432,'2026-06-10 15:14:38',0),(322996965639979008,322576880446210048,'it_IT',NULL,NULL,NULL,1,322576880534290432,'2026-06-10 15:14:38',322576880534290432,'2026-06-10 15:14:38',0),(322996965652561920,322576880446210048,'pt_PT',NULL,NULL,NULL,1,322576880534290432,'2026-06-10 15:14:38',322576880534290432,'2026-06-10 15:14:38',0),(322996965669339136,322576880446210048,'ja_JP',NULL,NULL,NULL,1,322576880534290432,'2026-06-10 15:14:38',322576880534290432,'2026-06-10 15:14:38',0),(322996965681922048,322576880446210048,'ko_KR',NULL,NULL,NULL,1,322576880534290432,'2026-06-10 15:14:38',322576880534290432,'2026-06-10 15:14:38',0),(322996965694504960,322576880446210048,'id_ID',NULL,NULL,NULL,1,322576880534290432,'2026-06-10 15:14:38',322576880534290432,'2026-06-10 15:14:38',0),(322996965707087872,322576880446210048,'ru_RU',NULL,NULL,NULL,1,322576880534290432,'2026-06-10 15:14:38',322576880534290432,'2026-06-10 15:14:38',0),(322996965719670784,322576880446210048,'th_TH',NULL,NULL,NULL,1,322576880534290432,'2026-06-10 15:14:38',322576880534290432,'2026-06-10 15:14:38',0),(322996965728059392,322576880446210048,'zh_CN','',NULL,'你好',1,322576880534290432,'2026-06-10 15:14:38',322576880534290432,'2026-06-10 15:14:38',0),(322996965740642304,322576880446210048,'en_US','s',NULL,'hello\n',1,322576880534290432,'2026-06-10 15:14:38',322576880534290432,'2026-06-10 15:14:38',0),(322996965753225216,322576880446210048,'zh_TW',NULL,NULL,'1',1,322576880534290432,'2026-06-10 15:14:38',322576880534290432,'2026-06-10 15:14:38',0),(322996965811945472,322576880446210048,'vi_VN',NULL,NULL,'iuquwe\n',1,322576880534290432,'2026-06-10 15:14:38',322576880534290432,'2026-06-10 15:14:38',0),(322996965832916992,322576880446210048,'my_MM',NULL,NULL,'1',1,322576880534290432,'2026-06-10 15:14:38',322576880534290432,'2026-06-10 15:14:38',0),(322996965841305600,322576880446210048,'tr_TR',NULL,NULL,'1',1,322576880534290432,'2026-06-10 15:14:38',322576880534290432,'2026-06-10 15:14:38',0),(322996965853888512,322576880446210048,'es_ES',NULL,NULL,'1',1,322576880534290432,'2026-06-10 15:14:38',322576880534290432,'2026-06-10 15:14:38',0),(322996965866471424,322576880446210048,'ms_MY',NULL,NULL,'1',1,322576880534290432,'2026-06-10 15:14:38',322576880534290432,'2026-06-10 15:14:38',0),(322996965874860032,322576880446210048,'fr_FR',NULL,NULL,'1',1,322576880534290432,'2026-06-10 15:14:38',322576880534290432,'2026-06-10 15:14:38',0),(322996965883248640,322576880446210048,'lo_LA',NULL,NULL,'1',1,322576880534290432,'2026-06-10 15:14:38',322576880534290432,'2026-06-10 15:14:38',0);
/*!40000 ALTER TABLE `mse_messenger_i18n` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `mse_messenger_language`
--

DROP TABLE IF EXISTS `mse_messenger_language`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mse_messenger_language` (
  `id` bigint NOT NULL COMMENT '主键(雪花ID)',
  `project_id` bigint NOT NULL COMMENT '项目id',
  `language` varchar(16) COLLATE utf8mb4_general_ci NOT NULL COMMENT '语言编码,如 zh_CN/en_US',
  `type` tinyint NOT NULL DEFAULT '0' COMMENT '1默认语言 0其他语言',
  `sort` int NOT NULL DEFAULT '0' COMMENT '排序',
  `create_by` bigint DEFAULT NULL COMMENT '创建者',
  `create_time` datetime DEFAULT NULL COMMENT '创建时间',
  `update_by` bigint DEFAULT NULL COMMENT '更新者',
  `update_time` datetime DEFAULT NULL COMMENT '更新时间',
  `del_flag` tinyint NOT NULL DEFAULT '0' COMMENT '删除标志 0存在 1删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_project_lang` (`project_id`,`language`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='信使启用语种';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `mse_messenger_language`
--

LOCK TABLES `mse_messenger_language` WRITE;
/*!40000 ALTER TABLE `mse_messenger_language` DISABLE KEYS */;
INSERT INTO `mse_messenger_language` VALUES (9100000000000000001,322576880446210048,'zh_CN',1,1,0,'2026-06-10 11:13:54',0,'2026-06-10 11:13:54',0),(9100000000000000002,322576880446210048,'en_US',0,0,0,'2026-06-10 11:13:54',0,'2026-06-10 11:13:54',0),(9100000000000000003,322576880446210048,'zh_TW',0,3,0,'2026-06-10 11:13:54',0,'2026-06-10 11:13:54',0),(9100000000000000004,322576880446210048,'vi_VN',0,2,0,'2026-06-10 11:13:54',0,'2026-06-10 11:13:54',0),(9100000000000000005,322576880446210048,'my_MM',0,4,0,'2026-06-10 11:13:54',0,'2026-06-10 11:13:54',0),(9100000000000000006,322576880446210048,'de_DE',0,5,0,'2026-06-10 11:13:54',0,'2026-06-10 11:13:54',0),(9100000000000000007,322576880446210048,'it_IT',0,6,0,'2026-06-10 11:13:54',0,'2026-06-10 11:13:54',0),(9100000000000000008,322576880446210048,'pt_PT',0,7,0,'2026-06-10 11:13:54',0,'2026-06-10 11:13:54',0),(9100000000000000009,322576880446210048,'ja_JP',0,8,0,'2026-06-10 11:13:54',0,'2026-06-10 11:13:54',0),(9100000000000000010,322576880446210048,'ko_KR',0,9,0,'2026-06-10 11:13:54',0,'2026-06-10 11:13:54',0),(9100000000000000011,322576880446210048,'id_ID',0,10,0,'2026-06-10 11:13:54',0,'2026-06-10 11:13:54',0),(9100000000000000012,322576880446210048,'ru_RU',0,11,0,'2026-06-10 11:13:54',0,'2026-06-10 11:13:54',0),(9100000000000000015,322576880446210048,'fr_FR',0,12,0,'2026-06-10 11:13:54',0,'2026-06-10 11:13:54',0);
/*!40000 ALTER TABLE `mse_messenger_language` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pf_addon_pack`
--

DROP TABLE IF EXISTS `pf_addon_pack`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pf_addon_pack` (
  `id` bigint NOT NULL COMMENT '主键(雪花ID)',
  `code` varchar(32) COLLATE utf8mb4_general_ci NOT NULL COMMENT '加量包编码',
  `name` varchar(64) COLLATE utf8mb4_general_ci NOT NULL COMMENT '名称',
  `resource_type` varchar(32) COLLATE utf8mb4_general_ci NOT NULL COMMENT '资源类型 translate_char=翻译字符/seat=席位',
  `spec_amount` bigint NOT NULL DEFAULT '0' COMMENT '规格数量(如100万字符/1个席位)',
  `price` decimal(20,8) NOT NULL DEFAULT '0.00000000' COMMENT '价格',
  `currency` varchar(16) COLLATE utf8mb4_general_ci DEFAULT 'USD' COMMENT '币种',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '状态 1上架 0下架',
  `create_by` bigint DEFAULT NULL COMMENT '创建者',
  `create_time` datetime DEFAULT NULL COMMENT '创建时间',
  `update_by` bigint DEFAULT NULL COMMENT '更新者',
  `update_time` datetime DEFAULT NULL COMMENT '更新时间',
  `del_flag` tinyint NOT NULL DEFAULT '0' COMMENT '删除标志 0存在 1删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='加量包定义';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pf_addon_pack`
--

LOCK TABLES `pf_addon_pack` WRITE;
/*!40000 ALTER TABLE `pf_addon_pack` DISABLE KEYS */;
INSERT INTO `pf_addon_pack` VALUES (1,'pack_translate_1m','翻译包(100万字符)','translate_char',1000000,69.00000000,'USD',1,0,'2026-06-09 11:16:29',NULL,'2026-06-18 15:29:06',0),(2,'pack_seat_1','席位包(1个席位)','seat',1,20.00000000,'USD',1,0,'2026-06-09 11:16:29',NULL,'2026-06-18 15:38:31',0),(3,'pack_customer_1k','客户拓展包(1000客户配额)','customer',1000,20.00000000,'USD',1,0,'2026-06-17 16:37:40',NULL,NULL,0),(4,'pack_aitokens_1m','AI Tokens包(100万Tokens)','ai_tokens',1000000,20.00000000,'USD',1,0,'2026-06-18 15:29:06',NULL,NULL,0);
/*!40000 ALTER TABLE `pf_addon_pack` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pf_admin`
--

DROP TABLE IF EXISTS `pf_admin`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pf_admin` (
  `id` bigint NOT NULL COMMENT '主键(雪花ID)',
  `username` varchar(64) COLLATE utf8mb4_general_ci NOT NULL COMMENT '登录名',
  `password_hash` varchar(128) COLLATE utf8mb4_general_ci NOT NULL COMMENT '密码哈希',
  `real_name` varchar(64) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '姓名',
  `role_id` bigint DEFAULT NULL COMMENT '平台角色id',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '状态 1正常 0禁用',
  `create_by` bigint DEFAULT NULL COMMENT '创建者',
  `create_time` datetime DEFAULT NULL COMMENT '创建时间',
  `update_by` bigint DEFAULT NULL COMMENT '更新者',
  `update_time` datetime DEFAULT NULL COMMENT '更新时间',
  `del_flag` tinyint NOT NULL DEFAULT '0' COMMENT '删除标志 0存在 1删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='平台管理员账号';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pf_admin`
--

LOCK TABLES `pf_admin` WRITE;
/*!40000 ALTER TABLE `pf_admin` DISABLE KEYS */;
INSERT INTO `pf_admin` VALUES (1,'admin','$2y$10$lrPNF6.5YR/EbeYRBRC6nOynMNdZeablhUtkOIw1r/y9yiQqraoDG','Super Admin',1,1,0,'2026-06-09 11:16:29',NULL,'2026-06-12 15:53:46',0);
/*!40000 ALTER TABLE `pf_admin` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pf_admin_role`
--

DROP TABLE IF EXISTS `pf_admin_role`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pf_admin_role` (
  `id` bigint NOT NULL COMMENT '主键(雪花ID)',
  `name` varchar(32) COLLATE utf8mb4_general_ci NOT NULL COMMENT '角色名称',
  `permissions` json DEFAULT NULL COMMENT '平台模块权限,如["users","tenants","subscriptions","orders","plans","agreements","stats"]',
  `create_by` bigint DEFAULT NULL COMMENT '创建者',
  `create_time` datetime DEFAULT NULL COMMENT '创建时间',
  `update_by` bigint DEFAULT NULL COMMENT '更新者',
  `update_time` datetime DEFAULT NULL COMMENT '更新时间',
  `del_flag` tinyint NOT NULL DEFAULT '0' COMMENT '删除标志 0存在 1删除',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='平台角色';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pf_admin_role`
--

LOCK TABLES `pf_admin_role` WRITE;
/*!40000 ALTER TABLE `pf_admin_role` DISABLE KEYS */;
INSERT INTO `pf_admin_role` VALUES (1,'超级管理员','[\"users\", \"tenants\", \"subscriptions\", \"orders\", \"plans\", \"addons\", \"agreements\", \"stats\", \"dict\", \"admins\", \"roles\", \"config\"]',0,'2026-06-09 11:16:29',NULL,'2026-06-18 11:24:17',0);
/*!40000 ALTER TABLE `pf_admin_role` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pf_agreement`
--

DROP TABLE IF EXISTS `pf_agreement`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pf_agreement` (
  `id` bigint NOT NULL COMMENT '主键(雪花ID)',
  `type` varchar(32) COLLATE utf8mb4_general_ci NOT NULL COMMENT '类型 terms服务条款/privacy隐私政策/subscription套餐订阅协议',
  `language` varchar(16) COLLATE utf8mb4_general_ci NOT NULL COMMENT '语言 zh_CN/en_US...',
  `title` varchar(128) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '标题',
  `content` longtext COLLATE utf8mb4_general_ci COMMENT '正文(富文本)',
  `version` varchar(32) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '版本',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '状态 1发布 0草稿',
  `create_by` bigint DEFAULT NULL COMMENT '创建者',
  `create_time` datetime DEFAULT NULL COMMENT '创建时间',
  `update_by` bigint DEFAULT NULL COMMENT '更新者',
  `update_time` datetime DEFAULT NULL COMMENT '更新时间',
  `del_flag` tinyint NOT NULL DEFAULT '0' COMMENT '删除标志 0存在 1删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_type_lang` (`type`,`language`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='平台协议/法律文档';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pf_agreement`
--

LOCK TABLES `pf_agreement` WRITE;
/*!40000 ALTER TABLE `pf_agreement` DISABLE KEYS */;
INSERT INTO `pf_agreement` VALUES (1,'terms','zh_CN','服务条款','<p>服务条款内容(占位,请在平台后管编辑)。</p>','v1.0',1,0,'2026-06-09 11:16:29',NULL,NULL,0),(2,'terms','en_US','Terms of Service','<p>Terms of Service (placeholder, edit in admin console).</p>','v1.0',1,0,'2026-06-09 11:16:29',NULL,NULL,0),(3,'privacy','zh_CN','隐私政策','<p>隐私政策内容(占位)。</p>','v1.0',1,0,'2026-06-09 11:16:29',NULL,NULL,0),(4,'privacy','en_US','Privacy Policy','<p>Privacy Policy (placeholder).</p>','v1.0',1,0,'2026-06-09 11:16:29',NULL,NULL,0),(5,'subscription','zh_CN','套餐订阅服务协议','<p>套餐订阅服务协议内容(占位)。</p>','v1.0',1,0,'2026-06-09 11:16:29',NULL,NULL,0),(6,'subscription','en_US','Subscription Agreement','<p>Subscription Agreement (placeholder).</p>','v1.0',1,0,'2026-06-09 11:16:29',NULL,NULL,0);
/*!40000 ALTER TABLE `pf_agreement` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pf_config`
--

DROP TABLE IF EXISTS `pf_config`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pf_config` (
  `id` bigint NOT NULL COMMENT '主键(雪花ID)',
  `config_key` varchar(64) NOT NULL COMMENT '配置键(唯一)',
  `config_value` varchar(1024) DEFAULT NULL COMMENT '配置值',
  `name` varchar(128) NOT NULL COMMENT '显示名称',
  `remark` varchar(255) DEFAULT NULL COMMENT '说明',
  `config_group` varchar(32) DEFAULT 'general' COMMENT '分组',
  `sort` int NOT NULL DEFAULT '0' COMMENT '排序',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '状态 1启用 0停用',
  `create_by` bigint DEFAULT NULL,
  `create_time` datetime DEFAULT NULL,
  `update_by` bigint DEFAULT NULL,
  `update_time` datetime DEFAULT NULL,
  `del_flag` tinyint NOT NULL DEFAULT '0' COMMENT '0存在 1删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_config_key` (`config_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='平台参数配置';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pf_config`
--

LOCK TABLES `pf_config` WRITE;
/*!40000 ALTER TABLE `pf_config` DISABLE KEYS */;
INSERT INTO `pf_config` VALUES (1,'contact_telegram','https://t.me/aitalky','客服 Telegram','套餐订阅页「免费体验」横幅点击跳转的 Telegram 链接','contact',1,1,0,'2026-06-18 11:14:38',NULL,NULL,0),(2,'order_expire_hours','24','订单支付有效期(小时)','下单后订单的支付有效时长,超时自动作废','billing',2,1,0,'2026-06-18 11:14:38',NULL,NULL,0),(3,'free_trial_days','15','免费体验天数','套餐订阅页「免费体验」横幅展示的天数','billing',3,1,0,'2026-06-18 11:14:38',NULL,NULL,0),(4,'default_translate_char','200','默认翻译包(字符)','未订阅项目概览展示的翻译包默认额度(字符)','quota',4,1,0,'2026-06-18 12:26:50',NULL,NULL,0),(5,'default_ai_tokens','4000','默认AI Tokens','未订阅项目概览展示的 AI Tokens 默认额度','quota',5,1,0,'2026-06-18 12:26:50',NULL,NULL,0),(6,'default_customer','100','默认客户拓展包(配额)','未订阅项目概览展示的客户配额默认额度','quota',6,1,0,'2026-06-18 12:26:50',NULL,NULL,0);
/*!40000 ALTER TABLE `pf_config` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pf_language`
--

DROP TABLE IF EXISTS `pf_language`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pf_language` (
  `id` bigint NOT NULL COMMENT '主键(雪花ID)',
  `code` varchar(16) COLLATE utf8mb4_general_ci NOT NULL COMMENT '语言编码 zh_CN/en_US...',
  `zh_name` varchar(64) COLLATE utf8mb4_general_ci NOT NULL COMMENT '中文名',
  `en_name` varchar(64) COLLATE utf8mb4_general_ci NOT NULL COMMENT '英文名',
  `sort` int NOT NULL DEFAULT '0' COMMENT '排序(小在前)',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '状态 1启用 0停用',
  `create_by` bigint DEFAULT NULL COMMENT '创建者',
  `create_time` datetime DEFAULT NULL COMMENT '创建时间',
  `update_by` bigint DEFAULT NULL COMMENT '更新者',
  `update_time` datetime DEFAULT NULL COMMENT '更新时间',
  `del_flag` tinyint NOT NULL DEFAULT '0' COMMENT '删除标志 0存在 1删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='平台语种字典(候选全集)';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pf_language`
--

LOCK TABLES `pf_language` WRITE;
/*!40000 ALTER TABLE `pf_language` DISABLE KEYS */;
INSERT INTO `pf_language` VALUES (1,'zh_CN','简体中文','Simplified Chinese',1,1,0,'2026-06-10 11:33:36',NULL,NULL,0),(2,'en_US','英文','English',2,1,0,'2026-06-10 11:33:36',NULL,NULL,0),(3,'zh_TW','繁体中文','Traditional Chinese',3,1,0,'2026-06-10 11:33:36',NULL,NULL,0),(4,'vi_VN','越南语','Vietnamese',4,1,0,'2026-06-10 11:33:36',NULL,NULL,0),(5,'my_MM','缅甸语','Burmese',5,1,0,'2026-06-10 11:33:36',NULL,NULL,0),(6,'de_DE','德语','German',6,1,0,'2026-06-10 11:33:36',NULL,NULL,0),(7,'it_IT','意大利语','Italian',7,1,0,'2026-06-10 11:33:36',NULL,NULL,0),(8,'pt_PT','葡萄牙语','Portuguese',8,1,0,'2026-06-10 11:33:36',NULL,NULL,0),(9,'ja_JP','日语','Japanese',9,1,0,'2026-06-10 11:33:36',NULL,NULL,0),(10,'ko_KR','韩语','Korean',10,1,0,'2026-06-10 11:33:36',NULL,NULL,0),(11,'id_ID','印尼语','Indonesian',11,1,0,'2026-06-10 11:33:36',NULL,NULL,0),(12,'ru_RU','俄语','Russian',12,1,0,'2026-06-10 11:33:36',NULL,NULL,0),(13,'th_TH','泰语','Thai',13,1,0,'2026-06-10 11:33:36',NULL,NULL,0),(14,'lo_LA','老挝语','Lao',14,1,0,'2026-06-10 11:33:36',NULL,NULL,0),(15,'fr_FR','法语','French',15,1,0,'2026-06-10 11:33:36',NULL,NULL,0),(16,'ms_MY','马来语','Malay',16,1,0,'2026-06-10 11:33:36',NULL,NULL,0),(17,'es_ES','西班牙语','Spanish',17,1,0,'2026-06-10 11:33:36',NULL,NULL,0),(18,'tr_TR','土耳其语','Turkish',18,1,0,'2026-06-10 11:33:36',NULL,NULL,0);
/*!40000 ALTER TABLE `pf_language` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pf_plan`
--

DROP TABLE IF EXISTS `pf_plan`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pf_plan` (
  `id` bigint NOT NULL COMMENT '主键(雪花ID)',
  `code` varchar(32) COLLATE utf8mb4_general_ci NOT NULL COMMENT '套餐编码',
  `name` varchar(64) COLLATE utf8mb4_general_ci NOT NULL COMMENT '套餐名称',
  `level` int NOT NULL DEFAULT '0' COMMENT '档位排序(越大越高)',
  `monthly_price` decimal(20,8) NOT NULL DEFAULT '0.00000000' COMMENT '每月价格',
  `currency` varchar(16) COLLATE utf8mb4_general_ci DEFAULT 'USD' COMMENT '计价币种',
  `min_months` int NOT NULL DEFAULT '6' COMMENT '起订月数',
  `is_custom` tinyint NOT NULL DEFAULT '0' COMMENT '是否定制版(私有化,费用另议)',
  `features` json DEFAULT NULL COMMENT '功能项(灵活,如["inbox","messenger","translate"])',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '状态 1上架 0下架',
  `create_by` bigint DEFAULT NULL COMMENT '创建者',
  `create_time` datetime DEFAULT NULL COMMENT '创建时间',
  `update_by` bigint DEFAULT NULL COMMENT '更新者',
  `update_time` datetime DEFAULT NULL COMMENT '更新时间',
  `del_flag` tinyint NOT NULL DEFAULT '0' COMMENT '删除标志 0存在 1删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='套餐';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pf_plan`
--

LOCK TABLES `pf_plan` WRITE;
/*!40000 ALTER TABLE `pf_plan` DISABLE KEYS */;
INSERT INTO `pf_plan` VALUES (1,'basic','基础版',1,49.00000000,'USD',6,0,'[\"inbox\", \"messenger\", \"article\", \"site\"]',1,0,'2026-06-18 10:25:02',NULL,NULL,0),(2,'standard','标准版',2,99.00000000,'USD',6,0,'[\"inbox\", \"messenger\", \"article\", \"site\", \"flow\"]',1,0,'2026-06-18 10:25:02',NULL,NULL,0),(3,'pro','专业版',3,149.00000000,'USD',6,0,'[\"inbox\", \"messenger\", \"article\", \"site\", \"domain\", \"dedicated\", \"flow\", \"ai_employee\", \"insight\"]',1,0,'2026-06-18 10:25:02',NULL,NULL,0),(4,'flagship','旗舰版',4,199.00000000,'USD',6,0,'[\"inbox\", \"messenger\", \"article\", \"site\", \"domain\", \"dedicated\", \"flow\", \"ai_employee\", \"insight\", \"marketing\"]',1,0,'2026-06-18 10:25:02',NULL,NULL,0),(5,'custom','定制版',5,0.00000000,'USD',6,1,'[\"data_private\", \"standalone\", \"custom_domain\", \"support_247\"]',1,0,'2026-06-18 10:25:02',NULL,NULL,0);
/*!40000 ALTER TABLE `pf_plan` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pf_plan_quota`
--

DROP TABLE IF EXISTS `pf_plan_quota`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pf_plan_quota` (
  `id` bigint NOT NULL COMMENT '主键(雪花ID)',
  `plan_id` bigint NOT NULL COMMENT '套餐id',
  `resource_type` varchar(32) COLLATE utf8mb4_general_ci NOT NULL COMMENT '资源类型 seat=席位/translate_char=翻译字符/customer=客户配额',
  `amount` bigint NOT NULL DEFAULT '0' COMMENT '配额数量',
  `is_unlimited` tinyint NOT NULL DEFAULT '0' COMMENT '是否无限制 1是',
  `create_by` bigint DEFAULT NULL COMMENT '创建者',
  `create_time` datetime DEFAULT NULL COMMENT '创建时间',
  `update_by` bigint DEFAULT NULL COMMENT '更新者',
  `update_time` datetime DEFAULT NULL COMMENT '更新时间',
  `del_flag` tinyint NOT NULL DEFAULT '0' COMMENT '删除标志 0存在 1删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_plan_res` (`plan_id`,`resource_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='套餐资源配额';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pf_plan_quota`
--

LOCK TABLES `pf_plan_quota` WRITE;
/*!40000 ALTER TABLE `pf_plan_quota` DISABLE KEYS */;
INSERT INTO `pf_plan_quota` VALUES (1,1,'seat',1,0,0,'2026-06-18 10:25:02',NULL,'2026-06-18 15:29:06',0),(2,1,'article',20,0,0,'2026-06-18 10:25:02',NULL,NULL,0),(3,1,'site',1,0,0,'2026-06-18 10:25:02',NULL,NULL,0),(4,1,'customer',5000,0,0,'2026-06-18 10:25:02',NULL,NULL,0),(5,1,'translate_char',1000000,0,0,'2026-06-18 10:25:02',NULL,NULL,0),(6,2,'seat',1,0,0,'2026-06-18 10:25:02',NULL,'2026-06-18 15:29:06',0),(7,2,'article',200,0,0,'2026-06-18 10:25:02',NULL,NULL,0),(8,2,'site',5,0,0,'2026-06-18 10:25:02',NULL,NULL,0),(9,2,'customer',50000,0,0,'2026-06-18 10:25:02',NULL,NULL,0),(10,2,'translate_char',5000000,0,0,'2026-06-18 10:25:02',NULL,NULL,0),(11,3,'seat',1,0,0,'2026-06-18 10:25:02',NULL,'2026-06-18 15:29:06',0),(12,3,'article',500,0,0,'2026-06-18 10:25:02',NULL,NULL,0),(13,3,'site',10,0,0,'2026-06-18 10:25:02',NULL,NULL,0),(14,3,'customer',0,1,0,'2026-06-18 10:25:02',NULL,NULL,0),(15,3,'translate_char',20000000,0,0,'2026-06-18 10:25:02',NULL,NULL,0),(16,4,'seat',1,0,0,'2026-06-18 10:25:02',NULL,'2026-06-18 15:29:06',0),(17,4,'article',0,1,0,'2026-06-18 10:25:02',NULL,NULL,0),(18,4,'site',0,1,0,'2026-06-18 10:25:02',NULL,NULL,0),(19,4,'customer',0,1,0,'2026-06-18 10:25:02',NULL,NULL,0),(20,4,'translate_char',0,1,0,'2026-06-18 10:25:02',NULL,NULL,0);
/*!40000 ALTER TABLE `pf_plan_quota` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sup_blacklist`
--

DROP TABLE IF EXISTS `sup_blacklist`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sup_blacklist` (
  `id` bigint NOT NULL COMMENT '主键(雪花ID)',
  `project_id` bigint NOT NULL COMMENT '项目id',
  `target_type` tinyint NOT NULL COMMENT '拉黑对象 1用户(业务UID,全设备生效) 2设备(游客)',
  `target_value` varchar(128) COLLATE utf8mb4_general_ci NOT NULL COMMENT '值: external_user_id 或 visitor_id',
  `reason` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '原因',
  `customer_name` varchar(128) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '客户名称(拉黑时快照)',
  `contact` varchar(128) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '联系方式(拉黑时快照)',
  `email` varchar(128) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '邮箱(拉黑时快照)',
  `location` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '所在地(拉黑时快照,来自会话IP定位)',
  `operator_name` varchar(128) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '操作者昵称(拉黑时快照)',
  `create_by` bigint DEFAULT NULL COMMENT '创建者',
  `create_time` datetime DEFAULT NULL COMMENT '创建时间',
  `update_by` bigint DEFAULT NULL COMMENT '更新者',
  `update_time` datetime DEFAULT NULL COMMENT '更新时间',
  `del_flag` tinyint NOT NULL DEFAULT '0' COMMENT '删除标志 0存在 1删除',
  PRIMARY KEY (`id`),
  KEY `idx_proj_target` (`project_id`,`target_type`,`target_value`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='黑名单';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sup_blacklist`
--

LOCK TABLES `sup_blacklist` WRITE;
/*!40000 ALTER TABLE `sup_blacklist` DISABLE KEYS */;
/*!40000 ALTER TABLE `sup_blacklist` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sup_quick_reply`
--

DROP TABLE IF EXISTS `sup_quick_reply`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sup_quick_reply` (
  `id` bigint NOT NULL COMMENT '主键(雪花ID)',
  `project_id` bigint NOT NULL COMMENT '项目id',
  `scope` tinyint NOT NULL DEFAULT '1' COMMENT '范围 1项目共享 2个人',
  `owner_member_id` bigint DEFAULT NULL COMMENT '个人时所属成员id',
  `category_id` bigint DEFAULT NULL COMMENT '分类id(sup_quick_reply_category;空=未分类)',
  `sort` int NOT NULL DEFAULT '0' COMMENT '排序',
  `title` varchar(128) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '话术简称',
  `content` varchar(2000) COLLATE utf8mb4_general_ci NOT NULL COMMENT '话术内容',
  `language` varchar(16) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '语言',
  `create_by` bigint DEFAULT NULL COMMENT '创建者',
  `create_time` datetime DEFAULT NULL COMMENT '创建时间',
  `update_by` bigint DEFAULT NULL COMMENT '更新者',
  `update_time` datetime DEFAULT NULL COMMENT '更新时间',
  `del_flag` tinyint NOT NULL DEFAULT '0' COMMENT '删除标志 0存在 1删除',
  PRIMARY KEY (`id`),
  KEY `idx_project` (`project_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='快捷回复';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sup_quick_reply`
--

LOCK TABLES `sup_quick_reply` WRITE;
/*!40000 ALTER TABLE `sup_quick_reply` DISABLE KEYS */;
INSERT INTO `sup_quick_reply` VALUES (325188093671899136,322576880446210048,1,NULL,NULL,0,'哈哈哈','![50](http://localhost:9000/aitalky/2026/06/16/9a43978d1e574f39b61ba141a1d38a4b.jpg)你是老溜',NULL,322576880534290432,'2026-06-16 16:21:23',322576880534290432,'2026-06-16 16:21:23',0),(325188746980884480,322576880446210048,1,NULL,325188147149275136,0,'买就是了','123123123123123![30](http://localhost:9000/aitalky/2026/06/16/ad0c6650204b46e894efc86101bb37ba.png)全场九折',NULL,322576880534290432,'2026-06-16 16:23:59',322576880534290432,'2026-06-16 16:23:59',0);
/*!40000 ALTER TABLE `sup_quick_reply` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sup_quick_reply_category`
--

DROP TABLE IF EXISTS `sup_quick_reply_category`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sup_quick_reply_category` (
  `id` bigint NOT NULL COMMENT '主键(雪花ID)',
  `project_id` bigint NOT NULL COMMENT '项目id',
  `name` varchar(64) COLLATE utf8mb4_general_ci NOT NULL COMMENT '分类名称',
  `sort` int NOT NULL DEFAULT '0' COMMENT '排序',
  `create_by` bigint DEFAULT NULL COMMENT '创建者',
  `create_time` datetime DEFAULT NULL COMMENT '创建时间',
  `update_by` bigint DEFAULT NULL COMMENT '更新者',
  `update_time` datetime DEFAULT NULL COMMENT '更新时间',
  `del_flag` tinyint NOT NULL DEFAULT '0' COMMENT '删除标志 0存在 1删除',
  PRIMARY KEY (`id`),
  KEY `idx_project` (`project_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='快捷回复分类';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sup_quick_reply_category`
--

LOCK TABLES `sup_quick_reply_category` WRITE;
/*!40000 ALTER TABLE `sup_quick_reply_category` DISABLE KEYS */;
INSERT INTO `sup_quick_reply_category` VALUES (325188147149275136,322576880446210048,'售后（1）',0,322576880534290432,'2026-06-16 16:21:36',322576880534290432,'2026-06-16 16:21:36',0);
/*!40000 ALTER TABLE `sup_quick_reply_category` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sys_oper_log`
--

DROP TABLE IF EXISTS `sys_oper_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sys_oper_log` (
  `id` bigint NOT NULL COMMENT '主键(雪花ID)',
  `project_id` bigint DEFAULT NULL COMMENT '项目id(平台操作为空)',
  `operator_id` bigint DEFAULT NULL COMMENT '操作人(成员id/账号id)',
  `action` varchar(128) COLLATE utf8mb4_general_ci NOT NULL COMMENT '操作描述',
  `method` varchar(256) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '方法(类.方法)',
  `params` text COLLATE utf8mb4_general_ci COMMENT '请求参数(仅 @Log(saveParams=true) 时记录,不含敏感字段)',
  `ip` varchar(64) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '操作IP',
  `cost_ms` bigint DEFAULT NULL COMMENT '耗时(毫秒)',
  `success` tinyint NOT NULL DEFAULT '1' COMMENT '是否成功 1是 0否',
  `error_msg` varchar(512) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '失败信息',
  `create_time` datetime DEFAULT NULL COMMENT '操作时间',
  PRIMARY KEY (`id`),
  KEY `idx_project` (`project_id`),
  KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='操作日志';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sys_oper_log`
--

LOCK TABLES `sys_oper_log` WRITE;
/*!40000 ALTER TABLE `sys_oper_log` DISABLE KEYS */;
INSERT INTO `sys_oper_log` VALUES (322576881029218304,322576880446210048,322576880534290432,'重命名成员','MemberController.rename',NULL,'0:0:0:0:0:0:0:1',10,1,NULL,'2026-06-09 11:25:22'),(322634705700651008,322580673657307136,322580673720221696,'重命名成员','MemberController.rename',NULL,'0:0:0:0:0:0:0:1',20,1,NULL,'2026-06-09 15:15:08'),(322700674615738368,322576880446210048,322576880534290432,'个人中心-改昵称','AccountController.rename',NULL,'0:0:0:0:0:0:0:1',20,1,NULL,'2026-06-09 19:37:16'),(322700692349255680,322576880446210048,322576880534290432,'个人中心-改昵称','AccountController.rename',NULL,'0:0:0:0:0:0:0:1',9,1,NULL,'2026-06-09 19:37:21'),(322700763383988224,322576880446210048,322576880534290432,'个人中心-改头像','AccountController.updateAvatar',NULL,'0:0:0:0:0:0:0:1',5,1,NULL,'2026-06-09 19:37:37'),(322700794547666944,322576880446210048,322576880534290432,'个人中心-改头像','AccountController.updateAvatar',NULL,'0:0:0:0:0:0:0:1',6,1,NULL,'2026-06-09 19:37:45'),(322700884213497856,322576880446210048,322576880534290432,'个人中心-改头像','AccountController.updateAvatar',NULL,'0:0:0:0:0:0:0:1',5,1,NULL,'2026-06-09 19:38:06'),(322913635665969152,322576880446210048,322576880534290432,'个人中心-改偏好','AccountController.preferences',NULL,'0:0:0:0:0:0:0:1',19,1,NULL,'2026-06-10 09:43:30'),(322913642242637824,322576880446210048,322576880534290432,'个人中心-改偏好','AccountController.preferences',NULL,'0:0:0:0:0:0:0:1',6,1,NULL,'2026-06-10 09:43:32'),(322913695556435968,322576880446210048,322576880534290432,'个人中心-改偏好','AccountController.preferences',NULL,'0:0:0:0:0:0:0:1',7,1,NULL,'2026-06-10 09:43:44'),(322913704674852864,322576880446210048,322576880534290432,'个人中心-改偏好','AccountController.preferences',NULL,'0:0:0:0:0:0:0:1',4,1,NULL,'2026-06-10 09:43:47'),(322914110490542080,322576880446210048,322576880534290432,'个人中心-改昵称','AccountController.rename',NULL,'0:0:0:0:0:0:0:1',7,1,NULL,'2026-06-10 09:45:23'),(322914139661926400,322576880446210048,322576880534290432,'个人中心-改昵称','AccountController.rename',NULL,'0:0:0:0:0:0:0:1',24,1,NULL,'2026-06-10 09:45:30'),(322915462570573824,322576880446210048,322576880534290432,'个人中心-改偏好','AccountController.preferences',NULL,'0:0:0:0:0:0:0:1',8,1,NULL,'2026-06-10 09:50:46'),(322915468954304512,322576880446210048,322576880534290432,'个人中心-改偏好','AccountController.preferences',NULL,'0:0:0:0:0:0:0:1',10,1,NULL,'2026-06-10 09:50:47'),(322920195288989696,322576880446210048,322576880534290432,'个人中心-改昵称','AccountController.rename',NULL,'0:0:0:0:0:0:0:1',8,1,NULL,'2026-06-10 10:09:34'),(322926338228879360,322576880446210048,322576880534290432,'个人中心-改用户名','AccountController.updateUsername',NULL,'0:0:0:0:0:0:0:1',15,1,NULL,'2026-06-10 10:33:59'),(322926404201086976,322576880446210048,322576880534290432,'个人中心-改邮箱','AccountController.changeEmail',NULL,'0:0:0:0:0:0:0:1',25,1,NULL,'2026-06-10 10:34:14'),(322926469619646464,322576880446210048,322576880534290432,'个人中心-改密码','AccountController.changePassword',NULL,'0:0:0:0:0:0:0:1',116,0,'old.password.error','2026-06-10 10:34:30'),(322926518638477312,322576880446210048,322576880534290432,'个人中心-改密码','AccountController.changePassword',NULL,'0:0:0:0:0:0:0:1',98,0,'old.password.error','2026-06-10 10:34:42'),(322926549709881344,322576880446210048,322576880534290432,'个人中心-改密码','AccountController.changePassword',NULL,'0:0:0:0:0:0:0:1',186,1,NULL,'2026-06-10 10:34:49'),(323639737422184448,322576880446210048,322576880534290432,'拉黑客户','BlacklistController.blockCustomer',NULL,'0:0:0:0:0:0:0:1',127,0,'\n### Error updating database.  Cause: java.sql.SQLIntegrityConstraintViolationException: Column \'id\' cannot be null\n### The error may exist in com/aitalky/messenger/mapper/SupBlacklistMapper.java (best guess)\n### The error may involve com.aitalky.messenger.mapper.SupBlacklistMapper.insert-Inline\n### The error occurred while setting parameters\n### SQL: INSERT INTO sup_blacklist (id, target_type, target_value, customer_name, contact, email, operator_name, create_by, create_time, update_by, update_','2026-06-12 09:48:46'),(323639888782032896,322576880446210048,322576880534290432,'拉黑客户','BlacklistController.blockCustomer',NULL,'0:0:0:0:0:0:0:1',26,0,'\n### Error updating database.  Cause: java.sql.SQLIntegrityConstraintViolationException: Column \'id\' cannot be null\n### The error may exist in com/aitalky/messenger/mapper/SupBlacklistMapper.java (best guess)\n### The error may involve com.aitalky.messenger.mapper.SupBlacklistMapper.insert-Inline\n### The error occurred while setting parameters\n### SQL: INSERT INTO sup_blacklist (id, target_type, target_value, customer_name, contact, email, operator_name, create_by, create_time, update_by, update_','2026-06-12 09:49:22'),(323644592580722688,322576880446210048,322576880534290432,'拉黑客户','BlacklistController.blockCustomer',NULL,'0:0:0:0:0:0:0:1',42,1,NULL,'2026-06-12 10:08:04'),(323646276035936256,322576880446210048,322576880534290432,'拉黑客户','BlacklistController.blockCustomer',NULL,'0:0:0:0:0:0:0:1',27,1,NULL,'2026-06-12 10:14:45'),(323646338082275328,322576880446210048,322576880534290432,'拉黑客户','BlacklistController.blockCustomer',NULL,'0:0:0:0:0:0:0:1',19,1,NULL,'2026-06-12 10:15:00'),(323646464150470656,322576880446210048,322576880534290432,'拉黑客户','BlacklistController.blockCustomer',NULL,'0:0:0:0:0:0:0:1',19,1,NULL,'2026-06-12 10:15:30'),(323646524808495104,322576880446210048,322576880534290432,'移出黑名单','BlacklistController.remove',NULL,'0:0:0:0:0:0:0:1',9,1,NULL,'2026-06-12 10:15:45'),(323665967383052288,322576880446210048,322576880534290432,'拉黑客户','BlacklistController.blockCustomer',NULL,'0:0:0:0:0:0:0:1',19,1,NULL,'2026-06-12 11:33:00'),(323665990254592000,322576880446210048,322576880534290432,'拉黑客户','BlacklistController.blockCustomer',NULL,'0:0:0:0:0:0:0:1',31,1,NULL,'2026-06-12 11:33:06'),(323666620381659136,322576880446210048,322576880534290432,'移出黑名单','BlacklistController.remove',NULL,'0:0:0:0:0:0:0:1',16,1,NULL,'2026-06-12 11:35:36'),(323683588518182912,322576880446210048,322576880534290432,'拉黑客户','BlacklistController.blockCustomer',NULL,'0:0:0:0:0:0:0:1',36,1,NULL,'2026-06-12 12:43:01'),(323745630251909120,322576880446210048,322576880534290432,'更新项目基本信息','ProjectController.update',NULL,'0:0:0:0:0:0:0:1',18,1,NULL,'2026-06-12 16:49:33'),(323745729988263936,322576880446210048,322576880534290432,'更新项目基本信息','ProjectController.update',NULL,'0:0:0:0:0:0:0:1',11,1,NULL,'2026-06-12 16:49:57'),(323746179026255872,322576880446210048,322576880534290432,'更新项目基本信息','ProjectController.update',NULL,'0:0:0:0:0:0:0:1',13,1,NULL,'2026-06-12 16:51:44'),(323746372979261440,322576880446210048,322576880534290432,'个人中心-改昵称','AccountController.rename',NULL,'0:0:0:0:0:0:0:1',18,1,NULL,'2026-06-12 16:52:30'),(323747895075405824,322576880446210048,322576880534290432,'更新项目基本信息','ProjectController.update',NULL,'0:0:0:0:0:0:0:1',20,1,NULL,'2026-06-12 16:58:33'),(323747995868725248,322576880446210048,322576880534290432,'更新项目基本信息','ProjectController.update',NULL,'0:0:0:0:0:0:0:1',12,1,NULL,'2026-06-12 16:58:57'),(323755071206588416,323754887592542208,323754887873560576,'更新项目基本信息','ProjectController.update',NULL,'0:0:0:0:0:0:0:1',14,1,NULL,'2026-06-12 17:27:04'),(323755179218305024,323748066425307136,323748066551136256,'更新项目基本信息','ProjectController.update',NULL,'0:0:0:0:0:0:0:1',23,1,NULL,'2026-06-12 17:27:30'),(324723629398949888,322576880446210048,322576880534290432,'创建邮箱邀请','InviteController.createEmail',NULL,'0:0:0:0:0:0:0:1',52,1,NULL,'2026-06-15 09:35:46'),(324738228521271296,322576880446210048,322576880534290432,'重命名成员','MemberController.rename',NULL,'0:0:0:0:0:0:0:1',44,1,NULL,'2026-06-15 10:33:47'),(324738272339165184,322576880446210048,324736000578289664,'个人中心-改昵称','AccountController.rename',NULL,'0:0:0:0:0:0:0:1',28,1,NULL,'2026-06-15 10:33:57'),(324738542443954176,322576880446210048,324736000578289664,'个人中心-改头像','AccountController.updateAvatar',NULL,'0:0:0:0:0:0:0:1',10,1,NULL,'2026-06-15 10:35:02'),(324738615999463424,322576880446210048,324736000578289664,'个人中心-退出项目','AccountController.leaveProject',NULL,'0:0:0:0:0:0:0:1',21,1,NULL,'2026-06-15 10:35:19'),(324768414100881408,322576880446210048,322576880534290432,'再次邀请','InviteController.resendEmail',NULL,'0:0:0:0:0:0:0:1',57,1,NULL,'2026-06-15 12:33:44'),(324774740889698304,322576880446210048,322576880534290432,'新建角色','RoleController.create',NULL,'0:0:0:0:0:0:0:1',31,1,NULL,'2026-06-15 12:58:52'),(324774768752459776,322576880446210048,322576880534290432,'保存角色权限','RoleController.updatePermissions',NULL,'0:0:0:0:0:0:0:1',11,1,NULL,'2026-06-15 12:58:59'),(324784323397943296,322576880446210048,322576880534290432,'调整成员角色','MemberController.updateRole',NULL,'0:0:0:0:0:0:0:1',30,1,NULL,'2026-06-15 13:36:57'),(324784556248924160,322576880446210048,324736000578289664,'调整成员角色','MemberController.updateRole',NULL,'0:0:0:0:0:0:0:1',25,1,NULL,'2026-06-15 13:37:52'),(325472636844900352,322576880446210048,322576880534290432,'个人中心-改偏好','AccountController.preferences',NULL,'0:0:0:0:0:0:0:1',19,1,NULL,'2026-06-17 11:12:04'),(325472674039988224,322576880446210048,322576880534290432,'个人中心-改偏好','AccountController.preferences',NULL,'0:0:0:0:0:0:0:1',8,1,NULL,'2026-06-17 11:12:12'),(325472706210299904,322576880446210048,322576880534290432,'个人中心-改系统推送','AccountController.updatePushSettings',NULL,'0:0:0:0:0:0:0:1',10,1,NULL,'2026-06-17 11:12:20');
/*!40000 ALTER TABLE `sys_oper_log` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-06-18 18:52:01
