package com.aitalky.app.dto;

import com.aitalky.messenger.dto.MessengerPublicVO;

/** 信使端初始化结果:客户令牌 + 会话 + 客户信息 + 信使公开配置(品牌/欢迎语/紧急通知,按语言) */
public record MessengerInitVO(
        String token, Long conversationId,
        Long customerId, String customerName, String customerAvatar, Long lastSeq,
        MessengerPublicVO config) {
}
