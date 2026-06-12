-- Flyway V11: 修改平台后管管理员密码(开发用)
-- 账号 admin / 新密码 123456。V6 原为 admin123456,本次按要求改短口令。
-- ⚠ 仅开发环境使用,生产部署前必须改密,严禁沿用本开发口令。
SET NAMES utf8mb4;

UPDATE `pf_admin`
SET `password_hash` = '$2y$10$lrPNF6.5YR/EbeYRBRC6nOynMNdZeablhUtkOIw1r/y9yiQqraoDG',
    `update_time`   = NOW()
WHERE `username` = 'admin';
