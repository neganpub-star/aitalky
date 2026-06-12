package com.aitalky.identity.dto;

import lombok.Data;

/** 邮箱邀请记录查询 */
@Data
public class EmailInviteQuery {
    /** 状态筛选 0待接受 1已接受 2已撤销 3已过期(空=全部) */
    private Integer status;
    /** 创建时间起(yyyy-MM-dd) */
    private String startDate;
    /** 创建时间止(yyyy-MM-dd) */
    private String endDate;
    /** 关键词:邮箱 / 邀请人昵称 */
    private String keyword;
    private long page = 1;
    private long size = 10;
}
