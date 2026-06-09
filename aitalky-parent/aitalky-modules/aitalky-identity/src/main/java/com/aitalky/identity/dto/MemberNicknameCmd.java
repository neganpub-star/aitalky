package com.aitalky.identity.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** 重命名 */
public record MemberNicknameCmd(@NotBlank @Size(max = 64) String nickname) {
}
