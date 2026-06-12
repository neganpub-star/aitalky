package com.aitalky.platform.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * 新增/编辑管理员命令。id 为空=新增(按 username 唯一,且 password 必填,RSA 加密传输);
 * 编辑时 username 不可改、password 走单独重置接口(此处忽略)。
 */
public record SaveAdminCmd(
        Long id,
        @NotBlank String username,
        /** RSA 加密的密码;仅新增时必填 */
        String password,
        String realName,
        @NotNull Long roleId,
        Integer status
) {
}
