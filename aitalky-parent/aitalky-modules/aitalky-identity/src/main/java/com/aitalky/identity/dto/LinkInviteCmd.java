package com.aitalky.identity.dto;

import jakarta.validation.constraints.NotNull;

/** 创建链接邀请。accessType: 0公开 1私密(私密自动生成访问验证码) */
public record LinkInviteCmd(
        @NotNull Long roleId,
        @NotNull Integer accessType) {
}
