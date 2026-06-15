-- Flyway V15: 系统角色收件箱权限对齐参考系统(存量角色回填)
-- 参考:负责人/管理员 数字员工✓;普通成员 全部✓ 未分配✓ 数字员工☐ 会话搜索✓。
-- 均幂等(已含则跳过)。
SET NAMES utf8mb4;

-- 负责人/管理员:页面补「数字员工」inbox.digitalEmployee
UPDATE `id_role`
SET `permissions` = JSON_ARRAY_APPEND(`permissions`, '$.pages', 'inbox.digitalEmployee'),
    `update_time` = NOW()
WHERE `is_system` = 1 AND `name` IN ('负责人', '管理员')
  AND JSON_CONTAINS(JSON_EXTRACT(`permissions`, '$.pages'), '"inbox.digitalEmployee"') = 0;

-- 普通成员:功能补「全部」inbox.viewAll
UPDATE `id_role`
SET `permissions` = JSON_ARRAY_APPEND(`permissions`, '$.functions', 'inbox.viewAll'),
    `update_time` = NOW()
WHERE `is_system` = 1 AND `name` = '普通成员'
  AND JSON_CONTAINS(JSON_EXTRACT(`permissions`, '$.functions'), '"inbox.viewAll"') = 0;

-- 普通成员:功能补「未分配」inbox.viewUnassigned
UPDATE `id_role`
SET `permissions` = JSON_ARRAY_APPEND(`permissions`, '$.functions', 'inbox.viewUnassigned'),
    `update_time` = NOW()
WHERE `is_system` = 1 AND `name` = '普通成员'
  AND JSON_CONTAINS(JSON_EXTRACT(`permissions`, '$.functions'), '"inbox.viewUnassigned"') = 0;
