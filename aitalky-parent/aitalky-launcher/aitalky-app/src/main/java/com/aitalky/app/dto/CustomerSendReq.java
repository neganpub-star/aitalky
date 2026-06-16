package com.aitalky.app.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.Map;

/** 客户发送消息。payload=图片/视频/文件结构化内容(如文件名/大小);文本消息可不传 */
public record CustomerSendReq(
        @NotNull Long conversationId,
        @NotBlank String content,
        String type,
        Map<String, Object> payload) {
}
