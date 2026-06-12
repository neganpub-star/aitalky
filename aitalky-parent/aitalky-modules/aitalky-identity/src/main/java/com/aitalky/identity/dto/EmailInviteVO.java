package com.aitalky.identity.dto;

import java.time.LocalDateTime;

/**
 * 邮箱邀请记录行。
 * @param valid 是否有效(待接受且未过期);失效=已接受/已撤销/已过期
 */
public record EmailInviteVO(
        Long id,
        String inviterName,
        String email,
        String roleName,
        String memberNickname,
        Integer status,
        boolean valid,
        Integer sendCount,
        LocalDateTime createTime) {
}
