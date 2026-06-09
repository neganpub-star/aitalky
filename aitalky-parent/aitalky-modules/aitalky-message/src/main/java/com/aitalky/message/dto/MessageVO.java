package com.aitalky.message.dto;

/** 消息出参 */
public record MessageVO(
        Long msgId, Long seq, Long conversationId,
        String senderType, Long senderId, String senderName, String senderAvatar,
        String type, String content, Boolean internal, Boolean isVisible, Long timestamp) {
}
