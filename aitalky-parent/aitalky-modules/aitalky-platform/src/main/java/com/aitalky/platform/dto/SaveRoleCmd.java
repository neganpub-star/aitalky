package com.aitalky.platform.dto;

import jakarta.validation.constraints.NotBlank;

import java.util.List;

/**
 * 新增/编辑角色命令。id 为空=新增(按 name 唯一);permissions=勾选的功能码列表。
 */
public record SaveRoleCmd(
        Long id,
        @NotBlank String name,
        List<String> permissions
) {
}
