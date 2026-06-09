package com.aitalky.identity.dto;

import jakarta.validation.constraints.NotNull;

/** 启用/禁用 */
public record MemberStatusCmd(@NotNull Integer status) {
}
