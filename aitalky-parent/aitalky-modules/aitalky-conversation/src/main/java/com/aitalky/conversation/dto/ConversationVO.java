package com.aitalky.conversation.dto;

import java.time.LocalDateTime;

/** 会话列表项(含客户展示信息) */
public record ConversationVO(
        Long id, Long customerId, String customerName, String customerAvatar,
        Long assigneeMemberId, Integer status,
        String lastMessagePreview, LocalDateTime lastMessageAt, Integer unreadCount) {
}
