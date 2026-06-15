-- Flyway V17: 改用既有 asn_* 分配表(asn_config/asn_group/asn_group_member),
-- 废弃 V16 误建的 cnv_assign_config/cnv_assign_member(与 asn_* 重复)。
-- asn_config 原设计无轮流游标列,补上;轮流分配需持久化上次分到的 member。

ALTER TABLE `asn_config`
    ADD COLUMN `round_robin_cursor` BIGINT NULL COMMENT '轮流分配游标:上次分到的 member_id' AFTER `capacity_limit`;

DROP TABLE IF EXISTS `cnv_assign_member`;
DROP TABLE IF EXISTS `cnv_assign_config`;
