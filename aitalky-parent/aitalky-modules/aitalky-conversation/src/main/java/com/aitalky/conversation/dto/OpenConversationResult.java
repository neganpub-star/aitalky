package com.aitalky.conversation.dto;

import com.aitalky.conversation.entity.CnvConversation;

/**
 * 打开/创建会话结果。
 * @param conversation          会话(新建或复用的活跃会话)
 * @param autoAssignedMemberId  新建会话经引擎自动分配到的坐席(复用会话/未分配为 null);供上层发分配系统消息
 */
public record OpenConversationResult(CnvConversation conversation, Long autoAssignedMemberId) {
}
