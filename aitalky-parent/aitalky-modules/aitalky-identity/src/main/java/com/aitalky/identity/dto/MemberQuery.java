package com.aitalky.identity.dto;

import lombok.Data;

/** 成员列表查询条件(GET 查询参数绑定) */
@Data
public class MemberQuery {
    /** 角色筛选 */
    private Long roleId;
    /** 在线状态 1在线 0离线 */
    private Integer onlineStatus;
    /** 账号状态 1启用 0禁用 */
    private Integer status;
    /** 昵称关键词 */
    private String keyword;
    /** 页码(从1开始) */
    private long page = 1;
    /** 每页大小 */
    private long size = 10;
}
