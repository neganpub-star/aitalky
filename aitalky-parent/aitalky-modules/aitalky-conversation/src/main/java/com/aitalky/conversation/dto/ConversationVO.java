package com.aitalky.conversation.dto;

import java.time.LocalDateTime;

/** 会话列表项(含客户展示信息)。lastSeq=会话当前最大 seq,供前端 serverLastSeq 对账补漏 */
public record ConversationVO(
        Long id, Long customerId, String customerName, String customerAvatar,
        Long assigneeMemberId, Integer status,
        String lastMessagePreview, LocalDateTime lastMessageAt, Integer unreadCount, Long lastSeq) {
}
