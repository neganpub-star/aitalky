package com.aitalky.identity.dto;

import lombok.Data;

/** 链接邀请记录查询 */
@Data
public class LinkInviteQuery {
    /** 状态筛选 1有效 0失效(空=全部) */
    private Integer status;
    private String startDate;
    private String endDate;
    /** 关键词:邀请人昵称 */
    private String keyword;
    private long page = 1;
    private long size = 10;
}
