package com.aitalky.identity.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** 创建项目命令 */
public record CreateProjectCmd(
        @NotBlank @Size(max = 64) String name
) {
}
