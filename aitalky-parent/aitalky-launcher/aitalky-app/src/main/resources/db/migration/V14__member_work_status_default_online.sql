-- Flyway V14: 工作状态(work_status)启用——存量成员默认置为「在线」
-- 在线状态列从此读 work_status(坐席自助开关),对齐参考系统;
-- 老成员建项目时 work_status=0 且开关未接线,统一回填为 1(在线),与新默认一致。
UPDATE `id_member`
SET `work_status` = 1,
    `update_time` = NOW()
WHERE `work_status` = 0;
