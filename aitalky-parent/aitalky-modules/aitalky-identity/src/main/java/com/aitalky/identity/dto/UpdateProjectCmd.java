package com.aitalky.identity.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** 更新项目基本信息(改名/换 Logo;负责人专属) */
public record UpdateProjectCmd(
        @NotBlank @Size(max = 40) String name,
        String logo) {
}
