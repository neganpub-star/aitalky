package com.aitalky.identity.dto;

import jakarta.validation.constraints.NotBlank;

/** 修改头像 */
public record MemberAvatarCmd(@NotBlank String avatar) {
}
