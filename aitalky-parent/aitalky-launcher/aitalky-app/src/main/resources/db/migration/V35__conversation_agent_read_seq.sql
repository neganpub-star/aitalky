-- 坐席已读位:坐席读到的最大 seq,用于信使端在「客户自己最后一条消息」显示「未读/已读」回执
-- 客户消息 seq > agent_read_seq → 信使端显示「未读」;坐席打开/加载会话即推进到 last_seq
ALTER TABLE cnv_conversation
    ADD COLUMN agent_read_seq BIGINT NOT NULL DEFAULT 0 COMMENT '坐席已读到的最大 seq(信使端据此显示客户消息未读/已读)';
