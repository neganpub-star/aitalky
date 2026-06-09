package com.aitalky.identity.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/** 登录命令:密码 + 邮箱验证码(2FA) */
public record LoginCmd(
        @NotBlank @Email String email,
        @NotBlank String password,
        @NotBlank String code
) {
}
