package com.aitalky.app.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/** 更改邮箱:新邮箱 + 发往新邮箱的验证码 */
public record ChangeEmailReq(
        @NotBlank @Email String email,
        @NotBlank String code
) {
}
