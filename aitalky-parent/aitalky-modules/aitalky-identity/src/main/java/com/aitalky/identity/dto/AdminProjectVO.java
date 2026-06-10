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
        LocalDateTime createTime
) {
}
