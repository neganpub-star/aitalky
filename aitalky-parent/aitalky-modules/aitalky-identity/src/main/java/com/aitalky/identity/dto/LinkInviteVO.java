package com.aitalky.identity.dto;

import java.time.LocalDateTime;

/**
 * 链接邀请记录行。
 * @param valid 是否有效(未禁用且未过期)
 */
public record LinkInviteVO(
        Long id,
        String inviterName,
        String roleName,
        Integer joinCount,
        Integer accessType,
        boolean valid,
        String token,
        LocalDateTime createTime) {
}
