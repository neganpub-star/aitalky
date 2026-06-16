package com.aitalky.message.dto;

import java.util.List;
import java.util.Map;

/** 发送消息命令(senderName/senderAvatar 为发送时快照)。payload=图片/视频/文件结构化内容(如文件名/大小) */
public record SendMessageCmd(
        Long projectId, Long conversationId, Long customerId,
        String senderType, Long senderId, String senderName, String senderAvatar,
        String type, String content, Map<String, Object> payload,
        Boolean internal, List<Long> mentions) {
}
