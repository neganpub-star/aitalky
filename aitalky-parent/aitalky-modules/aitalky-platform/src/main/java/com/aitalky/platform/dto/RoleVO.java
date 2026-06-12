package com.aitalky.platform.dto;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 平台角色列表项。permissions 已解析为功能码列表;adminCount=引用该角色的管理员数(用于删除前校验提示)。
 */
public record RoleVO(
        Long id,
        String name,
        List<String> permissions,
        int adminCount,
        LocalDateTime createTime
) {
}
