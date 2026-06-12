package com.aitalky.identity.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** 创建/重命名自定义角色 */
public record RoleNameCmd(@NotBlank @Size(max = 32) String name) {
}
