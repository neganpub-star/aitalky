-- ============================================================
-- aitalky 数据库初始化 ② 种子数据
-- 仅平台级(全局)数据 + 项目级 3 角色的权限模板(参考)
-- 说明:
--   1) 种子用固定小 ID(1,2,3...),运行期业务数据用雪花ID(极大),不会冲突
--   2) 密码/密钥仅占位,生产环境必须改(见各 NOTE)
--   3) 项目内的 3 个系统角色是「项目级」数据,在创建项目时由 identity 模块插入,
--      不能全局预置(需 project_id);本文件末尾给出权限 JSON 模板供实现参考
-- 执行: mysql -uroot -p aitalky < 02-seed.sql
-- ============================================================
USE `aitalky`;
SET NAMES utf8mb4;

-- ========================= 平台后管 =========================

-- 平台角色:超级管理员(全平台模块)
INSERT INTO `pf_admin_role` (`id`,`name`,`permissions`,`create_by`,`create_time`) VALUES
(1,'超级管理员',
 JSON_ARRAY('users','tenants','subscriptions','orders','plans','addons','agreements','stats'),
 0, NOW());

-- 平台管理员账号
-- NOTE: password_hash 为占位,实现登录(identity/auth)时用 BCrypt 重设默认密码,生产必须改
INSERT INTO `pf_admin` (`id`,`username`,`password_hash`,`real_name`,`role_id`,`status`,`create_by`,`create_time`) VALUES
(1,'admin','{bcrypt}REPLACE_ON_FIRST_DEPLOY','超级管理员',1,1,0,NOW());

-- 套餐(V1 精简 3 档;价格示例,以运营实际为准;起订 6 个月)
INSERT INTO `pf_plan` (`id`,`code`,`name`,`level`,`monthly_price`,`currency`,`min_months`,`is_custom`,`features`,`status`,`create_by`,`create_time`) VALUES
(1,'basic','基础版',  1, 99.00000000,'USD',6,0, JSON_ARRAY('inbox','messenger','translate','quickreply'),                     1,0,NOW()),
(2,'standard','标准版',2,299.00000000,'USD',6,0, JSON_ARRAY('inbox','messenger','translate','quickreply','group','blacklist'), 1,0,NOW()),
(3,'pro','专业版',    3,699.00000000,'USD',6,0, JSON_ARRAY('inbox','messenger','translate','quickreply','group','blacklist'), 1,0,NOW());

-- 套餐资源配额(资源类型:seat 席位 / translate_char 翻译字符 / customer 客户配额;is_unlimited=1 表示无限)
INSERT INTO `pf_plan_quota` (`id`,`plan_id`,`resource_type`,`amount`,`is_unlimited`,`create_by`,`create_time`) VALUES
(1,1,'seat',           3,        0,0,NOW()),
(2,1,'translate_char', 1000000,  0,0,NOW()),
(3,1,'customer',       5000,     0,0,NOW()),
(4,2,'seat',           10,       0,0,NOW()),
(5,2,'translate_char', 5000000,  0,0,NOW()),
(6,2,'customer',       50000,    0,0,NOW()),
(7,3,'seat',           30,       0,0,NOW()),
(8,3,'translate_char', 20000000, 0,0,NOW()),
(9,3,'customer',       0,        1,0,NOW());  -- 客户无限

-- 加量包(V1 仅 翻译包 + 席位包)
INSERT INTO `pf_addon_pack` (`id`,`code`,`name`,`resource_type`,`spec_amount`,`price`,`currency`,`status`,`create_by`,`create_time`) VALUES
(1,'pack_translate_1m','翻译包(100万字符)','translate_char',1000000,20.00000000,'USD',1,0,NOW()),
(2,'pack_seat_1','席位包(1个席位)',        'seat',         1,      30.00000000,'USD',1,0,NOW());

-- 协议三件套 × 多语言(占位内容,后管可编辑)
INSERT INTO `pf_agreement` (`id`,`type`,`language`,`title`,`content`,`version`,`status`,`create_by`,`create_time`) VALUES
(1,'terms',       'zh_CN','服务条款','<p>服务条款内容(占位,请在平台后管编辑)。</p>','v1.0',1,0,NOW()),
(2,'terms',       'en_US','Terms of Service','<p>Terms of Service (placeholder, edit in admin console).</p>','v1.0',1,0,NOW()),
(3,'privacy',     'zh_CN','隐私政策','<p>隐私政策内容(占位)。</p>','v1.0',1,0,NOW()),
(4,'privacy',     'en_US','Privacy Policy','<p>Privacy Policy (placeholder).</p>','v1.0',1,0,NOW()),
(5,'subscription','zh_CN','套餐订阅服务协议','<p>套餐订阅服务协议内容(占位)。</p>','v1.0',1,0,NOW()),
(6,'subscription','en_US','Subscription Agreement','<p>Subscription Agreement (placeholder).</p>','v1.0',1,0,NOW());


-- ============================================================
-- 项目级:3 个系统角色权限 JSON 模板(参考,非全局插入)
-- 由 identity 模块在「创建项目」时为该 project_id 插入这 3 行,is_system=1(名/权限不可改)
--
-- 页面权限 pages:    inbox 收件箱 | customers 客户 | statistics 数据统计 | settings 设置
-- 功能权限 functions:
--   inbox.viewAll 看全部会话 | inbox.viewUnassigned 看未分配
--   conversation.send 回复 | conversation.withdraw 撤回 | conversation.transfer 转派 | conversation.close 结束 | conversation.blacklist 加黑名单
--   member.manage 成员管理(重命名/改头像/禁用/删除/调整角色) | role.manage 角色管理
--   messenger.setting 信使设置 | assign.setting 会话设置 | group.manage 客服组 | quickreply.manage 快捷回复 | blacklist.manage 黑名单
--   project.setting 项目基本设置 | billing.manage 服务订阅/支付
--
-- ① 负责人 owner(全部权限,billing 仅其可用)
--   {"pages":["inbox","customers","statistics","settings"],
--    "functions":["inbox.viewAll","inbox.viewUnassigned","conversation.send","conversation.withdraw",
--      "conversation.transfer","conversation.close","conversation.blacklist","member.manage","role.manage",
--      "messenger.setting","assign.setting","group.manage","quickreply.manage","blacklist.manage",
--      "project.setting","billing.manage"]}
-- ② 管理员 admin(除 billing.manage 外)
--   {"pages":["inbox","customers","statistics","settings"],
--    "functions":["inbox.viewAll","inbox.viewUnassigned","conversation.send","conversation.withdraw",
--      "conversation.transfer","conversation.close","conversation.blacklist","member.manage","role.manage",
--      "messenger.setting","assign.setting","group.manage","quickreply.manage","blacklist.manage","project.setting"]}
-- ③ 普通成员 member(只看 我的/提及我的;能回复/撤回/结束;无管理与设置)
--   {"pages":["inbox","customers"],
--    "functions":["conversation.send","conversation.withdraw","conversation.close"]}
-- ============================================================
