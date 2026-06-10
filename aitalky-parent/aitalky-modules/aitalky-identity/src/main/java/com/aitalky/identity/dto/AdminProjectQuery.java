package com.aitalky.identity.dto;

import lombok.Data;

/** 平台后管 - 项目(租户)列表查询条件 */
@Data
public class AdminProjectQuery {
    /** 名称/appId 关键词 */
    private String keyword;
    /** 状态 1正常 0停用 */
    private Integer status;
    /** 站点 cn/intl */
    private String site;
    /** 页码(从1开始) */
    private long page = 1;
    /** 每页大小 */
    private long size = 10;
}
