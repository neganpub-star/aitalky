package com.aitalky.app.dto;

import java.time.LocalDateTime;

/** 会话详情(会话 + 客户信息),供详情面板用。lastSeq=会话当前最大 seq,作为前端对账补漏基准 */
public record ConversationDetailVO(
        Long id, Integer status, String source, String ip, String location,
        Integer autoTranslate, Long assigneeMemberId, LocalDateTime lastMessageAt,
        Long customerId, String externalUserId, String customerName, String customerAvatar,
        Integer customerType, String sourceLanguage, String contact, String email, String customAttrs,
        Long lastSeq, String assigneeName,
        // 该客户是否已在黑名单 + 命中记录 id(供详情面板「加入/移除黑名单」状态切换与移除)
        Boolean blocked, Long blacklistId) {
}
