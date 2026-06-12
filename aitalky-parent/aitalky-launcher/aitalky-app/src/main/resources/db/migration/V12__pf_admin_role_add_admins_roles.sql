-- Flyway V12: 超级管理员角色补「账号管理 admins」「角色管理 roles」功能码
-- 新增后管页面(账号管理/角色管理)需要对应功能码才显示菜单+放行接口
SET NAMES utf8mb4;
UPDATE `pf_admin_role`
SET `permissions` = '["users", "tenants", "subscriptions", "orders", "plans", "addons", "agreements", "stats", "dict", "admins", "roles"]',
    `update_time` = NOW()
WHERE `id` = 1;
