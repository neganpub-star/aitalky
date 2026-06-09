package com.aitalky.message.dto;

import java.util.List;

/** 发送消息命令(senderName/senderAvatar 为调用方传入的发送时快照) */
public record SendMessageCmd(
        Long projectId, Long conversationId, Long customerId,
        String senderType, Long senderId, String senderName, String senderAvatar,
        String type, String content,
        Boolean internal, List<Long> mentions) {
}
