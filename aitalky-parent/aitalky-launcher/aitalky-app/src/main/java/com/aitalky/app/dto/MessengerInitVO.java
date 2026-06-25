package com.aitalky.app.dto;

import com.aitalky.messenger.dto.MessengerPublicVO;

/**
 * 信使端初始化结果:客户令牌 + 会话 + 客户信息 + 信使公开配置(品牌/欢迎语/紧急通知,按语言) + 服务坐席头部。
 * channelName=专属渠道名(会话经专属策略接入时有值),信使头部品牌名下展示一行渠道名;普通接入为 null。
 */
public record MessengerInitVO(
        String token, Long conversationId,
        Long customerId, String customerName, String customerAvatar, Long lastSeq,
        MessengerPublicVO config, MessengerAgentVO agent, String channelName,
        // 坐席已读位:信使端据此在「客户自己最后一条消息」显示未读(seq>此值)/已读(消失)
        Long agentReadSeq) {
}
