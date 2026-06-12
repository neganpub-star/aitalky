package com.aitalky.conversation.dto;

import lombok.Data;

/** 会话搜索查询。type: uid(业务系统UID) / content(会话内容) */
@Data
public class ConversationSearchQuery {
    private String type = "uid";
    private String keyword;
    private long page = 1;
    private long size = 20;
}
