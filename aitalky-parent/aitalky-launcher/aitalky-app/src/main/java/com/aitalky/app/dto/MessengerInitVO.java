package com.aitalky.app.dto;

/** 信使端初始化结果:客户令牌 + 会话 + 客户信息 */
public record MessengerInitVO(
        String token, Long conversationId,
        Long customerId, String customerName, String customerAvatar, Long lastSeq) {
}
