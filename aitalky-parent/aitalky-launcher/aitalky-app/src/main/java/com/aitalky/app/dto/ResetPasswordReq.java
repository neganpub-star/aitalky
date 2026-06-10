package com.aitalky.app.dto;

import jakarta.validation.constraints.NotBlank;

/** 重置密码:发往本账号邮箱的验证码 + 新密码(RSA 密文) */
public record ResetPasswordReq(
        @NotBlank String code,
        @NotBlank String newPassword
) {
}
