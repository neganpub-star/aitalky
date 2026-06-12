package com.aitalky.platform.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * 重置管理员密码命令。password 为 RSA 加密文本(与登录同一公钥)。
 */
public record ResetAdminPasswordCmd(
        @NotBlank String password
) {
}
