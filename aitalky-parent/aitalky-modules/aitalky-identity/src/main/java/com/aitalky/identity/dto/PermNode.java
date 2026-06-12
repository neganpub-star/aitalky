package com.aitalky.identity.dto;

/**
 * 权限叶子节点(角色管理权限树)。
 * @param token 权限标识(与 SystemRole 中 pages/functions 一致)
 * @param name  显示名
 * @param store 存入角色 JSON 的哪个数组:"page"(pages[]) / "function"(functions[])
 */
public record PermNode(String token, String name, String store) {
}
