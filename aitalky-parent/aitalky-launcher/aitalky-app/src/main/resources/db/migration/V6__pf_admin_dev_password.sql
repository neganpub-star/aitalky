-- Flyway V6: 设置平台后管默认管理员密码(开发用)
-- 背景:V2 种子里 pf_admin.password_hash 为占位符 {bcrypt}REPLACE_ON_FIRST_DEPLOY,无法登录。
-- 此处写入 BCrypt 真哈希,默认账号 admin / 密码 admin123456。
-- ⚠ 生产部署前必须改密(后管「修改密码」或重置此哈希),严禁沿用本开发口令。
SET NAMES utf8mb4;

UPDATE `pf_admin`
SET `password_hash` = '$2y$10$lFGbPJbJF0qmPCFLNaftAuLc/2b2Tp5R9tK3fzKjx4QTbIZpTTbqO',
    `update_time`   = NOW()
WHERE `username` = 'admin';
