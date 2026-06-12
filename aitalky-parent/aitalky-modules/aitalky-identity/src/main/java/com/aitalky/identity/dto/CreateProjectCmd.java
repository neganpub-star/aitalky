package com.aitalky.identity.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** 创建项目命令(name=项目名;code=账号邮箱验证码,创建需二次验证) */
public record CreateProjectCmd(
        @NotBlank @Size(max = 64) String name,
        @NotBlank String code
) {
}
