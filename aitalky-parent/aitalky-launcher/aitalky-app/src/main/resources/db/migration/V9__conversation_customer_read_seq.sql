-- 已读回执:客户已读到的会话内 seq(坐席端据此显示自己消息"已读/未读")
-- 客户在聊天界面可见时静默上报已读位;坐席消息 seq <= customer_read_seq 即"已读"
ALTER TABLE `cnv_conversation`
    ADD COLUMN `customer_read_seq` bigint NOT NULL DEFAULT 0 COMMENT '客户已读到的seq(已读回执)' AFTER `last_seq`;
