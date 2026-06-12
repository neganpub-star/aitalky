package com.aitalky.platform.dto;

import lombok.Data;

/** 平台管理员列表查询条件 */
@Data
public class AdminQuery {
    /** 用户名/姓名关键词 */
    private String keyword;
    /** 状态 1正常 0禁用 */
    private Integer status;
    /** 页码(从1开始) */
    private long page = 1;
    /** 每页大小 */
    private long size = 10;
}
