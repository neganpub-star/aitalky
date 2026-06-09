package com.aitalky.identity.dto;

import com.aitalky.framework.verify.VerifyScene;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/** 发送验证码命令 */
public record SendCodeCmd(
        @NotBlank @Email String email,
        @NotNull VerifyScene scene
) {
}
