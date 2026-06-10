package com.aitalky.app.dto;

import jakarta.validation.constraints.NotBlank;

/** 更改密码:旧密码 + 新密码(均为 RSA 密文,明文长度后端解密后校验) */
public record ChangePasswordReq(
        @NotBlank String oldPassword,
        @NotBlank String newPassword
) {
}
