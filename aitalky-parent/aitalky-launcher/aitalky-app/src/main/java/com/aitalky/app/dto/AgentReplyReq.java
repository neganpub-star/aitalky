package com.aitalky.app.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.List;
import java.util.Map;

/** 坐席回复。payload=图片/视频/文件结构化内容(如文件名/大小);文本消息可不传 */
public record AgentReplyReq(
        @NotBlank String content,
        String type,
        Map<String, Object> payload,
        Boolean internal,
        List<Long> mentions) {
}
