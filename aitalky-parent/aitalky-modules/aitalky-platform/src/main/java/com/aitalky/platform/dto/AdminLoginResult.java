package com.aitalky.platform.dto;

import java.util.List;

/**
 * 登录结果:平台级令牌 + 管理员信息 + 平台权限码。
 * <p>前端按 permissions 渲染后管菜单;后端仍以 {@code @RequiresFunction} 独立校验。
 */
public record AdminLoginResult(
        String token,
        Long adminId,
        String username,
        String realName,
        String roleName,
        List<String> permissions
) {
}
