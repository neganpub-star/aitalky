package com.aitalky.identity.dto;

import java.time.LocalDateTime;

/**
 * 平台后管 - 项目(租户)列表项。
 */
public record AdminProjectVO(
        Long id,
        String name,
        String appId,
        Long ownerAccountId,
        String ownerEmail,
        String site,
        Integer isPrivate,
        Integer status,
        Integer memberCount,
        String planName,        // 当前订阅套餐名(无订阅=null)
        Boolean subExpired,     // 订阅是否已过期(无订阅=null)
        LocalDateTime createTime
) {
}
