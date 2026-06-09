package com.aitalky.identity.dto;

import java.util.Set;

/**
 * 进入项目结果。token 为「项目级」令牌,携带 projectId/memberId/roleId/functions,
 * 之后访问租户接口由多租户拦截器据此隔离、由 functions 做功能鉴权。
 */
public record EnterResult(
        String token,
        Long projectId,
        Long memberId,
        Long roleId,
        String roleName,
        Set<String> functions
) {
}
