package com.aitalky.identity.dto;

import java.util.List;

/**
 * 登录结果。token 为「账号级」令牌(仅含 accountId),用于创建/进入项目;
 * 进入具体项目后再换取「项目级」令牌(见 EnterResult)。
 */
public record LoginResult(
        String token,
        Long accountId,
        String email,
        List<ProjectBrief> projects
) {
}
