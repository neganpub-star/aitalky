package com.aitalky.conversation.dto;

import lombok.Data;

/** 收件箱列表查询。view: mine/unassigned/all/mention */
@Data
public class ConversationListQuery {
    private String view = "mine";
    private Integer status;        // 0等待 1进行中 2已结束
    private long page = 1;
    private long size = 20;
}
