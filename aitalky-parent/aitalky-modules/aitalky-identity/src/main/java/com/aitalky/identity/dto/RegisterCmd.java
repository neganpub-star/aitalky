package com.aitalky.identity.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/** 注册命令(password 为 RSA 加密后的密文,明文长度在解密后校验) */
public record RegisterCmd(
        @NotBlank @Email String email,
        @NotBlank String password,
        @NotBlank String code
) {
}
