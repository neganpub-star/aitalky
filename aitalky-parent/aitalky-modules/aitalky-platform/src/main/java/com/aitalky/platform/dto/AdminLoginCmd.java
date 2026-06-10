package com.aitalky.platform.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * 平台后管登录命令:用户名 + 密码(RSA 加密传输)+ 图形验证码。
 *
 * @param username    登录名
 * @param password    RSA 加密后的密码密文
 * @param captchaId   图形验证码标识(由 captcha 接口下发)
 * @param captchaCode 用户输入的验证码
 */
public record AdminLoginCmd(
        @NotBlank String username,
        @NotBlank String password,
        @NotBlank String captchaId,
        @NotBlank String captchaCode
) {
}
