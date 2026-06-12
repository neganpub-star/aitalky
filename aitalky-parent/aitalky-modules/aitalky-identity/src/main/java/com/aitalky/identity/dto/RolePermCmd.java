package com.aitalky.identity.dto;

import java.util.List;

/** 保存角色权限(页面权限 + 功能权限) */
public record RolePermCmd(List<String> pages, List<String> functions) {
}
