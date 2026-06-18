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
