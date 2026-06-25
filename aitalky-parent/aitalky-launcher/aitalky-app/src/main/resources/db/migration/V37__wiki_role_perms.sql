-- Flyway V37: 知识库(wiki)功能权限对齐——给系统角色「负责人/管理员」补 wiki 页面 + 功能码。
-- wiki.view 查看 / wiki.manage 管理(创建/编辑/删除/发布)。均幂等(已含则跳过)。
SET NAMES utf8mb4;

-- 负责人/管理员:页面补「知识库」wiki
UPDATE `id_role`
SET `permissions` = JSON_ARRAY_APPEND(`permissions`, '$.pages', 'wiki'),
    `update_time` = NOW()
WHERE `is_system` = 1 AND `name` IN ('负责人', '管理员')
  AND JSON_CONTAINS(JSON_EXTRACT(`permissions`, '$.pages'), '"wiki"') = 0;

-- 负责人/管理员:功能补「查看」wiki.view
UPDATE `id_role`
SET `permissions` = JSON_ARRAY_APPEND(`permissions`, '$.functions', 'wiki.view'),
    `update_time` = NOW()
WHERE `is_system` = 1 AND `name` IN ('负责人', '管理员')
  AND JSON_CONTAINS(JSON_EXTRACT(`permissions`, '$.functions'), '"wiki.view"') = 0;

-- 负责人/管理员:功能补「管理」wiki.manage
UPDATE `id_role`
SET `permissions` = JSON_ARRAY_APPEND(`permissions`, '$.functions', 'wiki.manage'),
    `update_time` = NOW()
WHERE `is_system` = 1 AND `name` IN ('负责人', '管理员')
  AND JSON_CONTAINS(JSON_EXTRACT(`permissions`, '$.functions'), '"wiki.manage"') = 0;
