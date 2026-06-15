-- Flyway V13: 给所有现存系统角色补「会话搜索 inbox.search」功能码
-- 会话搜索上线后,新建项目已含此权限;老项目的系统角色权限是建项目时写死在库里的,需补。
-- 仅当 functions 数组里尚无 inbox.search 时追加(幂等)。
SET NAMES utf8mb4;
UPDATE `id_role`
SET `permissions` = JSON_ARRAY_APPEND(`permissions`, '$.functions', 'inbox.search'),
    `update_time` = NOW()
WHERE `is_system` = 1
  AND JSON_CONTAINS(JSON_EXTRACT(`permissions`, '$.functions'), '"inbox.search"') = 0;
