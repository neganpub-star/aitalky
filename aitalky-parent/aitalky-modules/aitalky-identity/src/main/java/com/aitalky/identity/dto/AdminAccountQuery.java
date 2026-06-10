package com.aitalky.identity.dto;

import lombok.Data;

/** 平台后管 - 用户(账号)列表查询条件 */
@Data
public class AdminAccountQuery {
    /** 邮箱/用户名关键词 */
    private String keyword;
    /** 状态 1正常 0禁用 */
    private Integer status;
    /** 页码(从1开始) */
    private long page = 1;
    /** 每页大小 */
    private long size = 10;
}
