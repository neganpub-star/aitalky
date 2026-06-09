package com.aitalky.identity.dto;

import jakarta.validation.constraints.NotNull;

/** 调整角色 */
public record MemberRoleCmd(@NotNull Long roleId) {
}
