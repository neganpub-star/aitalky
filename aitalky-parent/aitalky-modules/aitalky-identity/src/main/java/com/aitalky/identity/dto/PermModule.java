package com.aitalky.identity.dto;

import java.util.List;

/**
 * 权限模块(角色管理:模块/页面/功能 三列)。
 * @param pages     "页面"列节点
 * @param functions "功能"列节点
 */
public record PermModule(String key, String name, List<PermNode> pages, List<PermNode> functions) {
}
