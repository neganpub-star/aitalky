package com.aitalky.app.dto;

import java.time.LocalDateTime;

/** 会话详情(会话 + 客户信息),供详情面板用 */
public record ConversationDetailVO(
        Long id, Integer status, String source, String ip, String location,
        Integer autoTranslate, Long assigneeMemberId, LocalDateTime lastMessageAt,
        Long customerId, String externalUserId, String customerName, String customerAvatar,
        Integer customerType, String sourceLanguage, String contact, String email, String customAttrs) {
}
