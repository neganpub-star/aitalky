package com.aitalky.platform.dto;

import java.util.List;

/**
 * 当前登录管理员资料(/api/admin/me),前端用于回显与菜单渲染。
 */
public record AdminProfileVO(
        Long adminId,
        String username,
        String realName,
        String roleName,
        List<String> permissions
) {
}
