-- Flyway V38: 会话列表预览系统消息本地化
-- 列表预览快照(last_message_preview)对系统消息存的是中文兜底,英文环境不翻译。
-- 增 last_sys_type:最后一条消息的系统消息语义码(assigned/unassigned/timeout),
-- 非系统消息为 NULL;前端据此按界面语言本地化预览(content 中文仅兜底)。
ALTER TABLE `cnv_conversation`
    ADD COLUMN `last_sys_type` VARCHAR(16) NULL COMMENT '最后消息系统语义码(assigned/unassigned/timeout;普通消息NULL)' AFTER `last_message_preview`;

-- 历史回填:存量会话预览快照是「会话超时结束」中文(仅 timeout 系统消息会写预览),回填语义码使其本地化。
UPDATE `cnv_conversation` SET `last_sys_type` = 'timeout' WHERE `last_message_preview` = '会话超时结束';
