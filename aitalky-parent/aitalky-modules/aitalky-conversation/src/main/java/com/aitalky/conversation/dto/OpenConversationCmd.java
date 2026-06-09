package com.aitalky.conversation.dto;

/** 建/取会话命令 */
public record OpenConversationCmd(
        Long projectId, Long customerId, Long groupId,
        String source, String deviceInfo, String ip, String location) {
}
