package com.aitalky.identity.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** 注册命令(需先获取邮箱验证码) */
public record RegisterCmd(
        @NotBlank @Email String email,
        @NotBlank @Size(min = 6, max = 32) String password,
        @NotBlank String code
) {
}
