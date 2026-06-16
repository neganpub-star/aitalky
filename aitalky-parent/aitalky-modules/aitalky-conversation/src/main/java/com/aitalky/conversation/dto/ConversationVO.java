package com.aitalky.conversation.dto;

import java.time.LocalDateTime;

/** 会话列表项(含客户展示信息)。lastSeq=会话当前最大 seq,供前端 serverLastSeq 对账补漏 */
public record ConversationVO(
        Long id, Long customerId, String customerName, String customerAvatar,
        // customerUid=客户业务系统UID(唯一);昵称随机名池只有100种、易重名,搜索/列表用它区分客户
        String customerUid,
        Long assigneeMemberId, Integer status,
        String lastMessagePreview,
        // 最后一条消息发送者快照(列表项小头像:谁最后回复显示谁;name 供头像缺省时取首字母兜底)
        String lastSenderAvatar, String lastSenderName,
        LocalDateTime lastMessageAt, Integer unreadCount, Long lastSeq) {
}
