-- 会话列表项展示「最近一条消息的发送者头像」(谁最后回复就显示谁的头像)。
-- 按 last_message_preview 同样的做法,把发送者快照冗余到会话行,列表渲染免回查 Mongo。
ALTER TABLE `cnv_conversation`
  ADD COLUMN `last_sender_avatar` VARCHAR(512) NULL COMMENT '最后一条消息发送者头像快照',
  ADD COLUMN `last_sender_name` VARCHAR(128) NULL COMMENT '最后一条消息发送者昵称快照';
