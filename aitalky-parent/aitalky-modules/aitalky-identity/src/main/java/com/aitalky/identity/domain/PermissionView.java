package com.aitalky.identity.domain;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

/**
 * 角色权限 JSON 的解析视图: {"pages":[...],"functions":[...]}。
 * <p>用于把 id_role.permissions 文本解析出 functions,放进项目级 JWT 做功能鉴权。
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record PermissionView(List<String> pages, List<String> functions) {
}
