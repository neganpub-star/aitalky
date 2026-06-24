-- 会话级双向翻译设置:
--   A 客户消息方向: auto_translate(已有,开关) + translate_to(目标语言=坐席看的语言);
--      坐席消息区头部「将客户消息翻译为 X / 开启翻译」控制。
--   B 坐席消息方向: agent_auto_translate(开关);目标语言=客户源语言(cus_customer.source_language);
--      坐席发消息自动翻成客户语言发出,坐席侧展示原文。底部「自动翻译」开关控制。
ALTER TABLE `cnv_conversation`
  ADD COLUMN `translate_to` varchar(16) NULL COMMENT '客户消息翻译目标语言(aitalky 语言码 zh_CN/en_US...);空=未设' AFTER `auto_translate`,
  ADD COLUMN `agent_auto_translate` tinyint NOT NULL DEFAULT 0 COMMENT '坐席消息是否自动翻成客户语言发出(B方向开关)' AFTER `translate_to`;
