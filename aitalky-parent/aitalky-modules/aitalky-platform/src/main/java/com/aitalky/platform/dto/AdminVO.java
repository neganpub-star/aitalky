package com.aitalky.platform.dto;

import java.time.LocalDateTime;

/**
 * 平台管理员列表项。密码哈希等敏感字段绝不出参。
 */
public record AdminVO(
        Long id,
        String username,
        String realName,
        Long roleId,
        String roleName,
        Integer status,
        LocalDateTime createTime
) {
}
