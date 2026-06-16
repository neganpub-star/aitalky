package com.aitalky.message.dto;

import java.util.Map;

/** 消息出参。payload=图片/视频/文件结构化内容(如文件名/大小);文本消息为 null */
public record MessageVO(
        Long msgId, Long seq, Long conversationId,
        String senderType, Long senderId, String senderName, String senderAvatar,
        String type, String content, Map<String, Object> payload,
        Boolean internal, Boolean isVisible, Long timestamp) {
}
