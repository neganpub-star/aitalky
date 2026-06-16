package com.aitalky.identity.dto;

import java.util.List;

/**
 * 权限模块(角色管理:模块/页面/功能 三列)。模块名跨多行,每行见 {@link PermRow}。
 * @param key  模块标识
 * @param name 模块名(跨行显示在「模块」列)
 * @param rows 模块下的行(每行=页面节点 + 功能节点)
 */
public record PermModule(String key, String name, List<PermRow> rows) {
}
