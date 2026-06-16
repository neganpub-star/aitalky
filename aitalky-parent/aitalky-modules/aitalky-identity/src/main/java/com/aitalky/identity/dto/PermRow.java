package com.aitalky.identity.dto;

import java.util.List;

/**
 * 权限模块内的一行(对齐参考:模块跨多行,每行=「页面」节点 + 该行「功能」节点)。
 * @param pages     该行「页面」列节点
 * @param functions 该行「功能」列节点
 */
public record PermRow(List<PermNode> pages, List<PermNode> functions) {
}
