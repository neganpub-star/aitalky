package com.aitalky.identity.dto;

import java.time.LocalDateTime;

/**
 * 平台后管 - 项目(租户)详情。
 * <p>appSecret 属敏感凭据,不出参(运营查看不需要 SDK 密钥)。
 */
public record AdminProjectDetailVO(
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
