package com.aitalky.identity.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

/** 创建邮箱邀请(单个=列表只1个;批量=多个) */
public record EmailInviteCmd(
        @NotEmpty List<String> emails,
        @NotNull Long roleId) {
}
