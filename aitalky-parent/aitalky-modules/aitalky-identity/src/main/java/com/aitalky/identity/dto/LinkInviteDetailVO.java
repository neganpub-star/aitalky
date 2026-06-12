package com.aitalky.identity.dto;

import java.time.LocalDateTime;

/** 链接邀请详情(对齐现网"详情") */
public record LinkInviteDetailVO(
        Long id,
        String projectName,
        String roleName,
        Integer joinCount,
        Integer accessType,
        String accessCode,
        boolean valid,
        String token,
        LocalDateTime createTime,
        LocalDateTime expireTime) {
}
