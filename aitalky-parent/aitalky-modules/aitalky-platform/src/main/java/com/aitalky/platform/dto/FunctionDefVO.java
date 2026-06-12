package com.aitalky.platform.dto;

/**
 * 可分配功能码定义项(角色管理页勾选框用)。
 */
public record FunctionDefVO(
        String code,
        String zhName,
        String enName
) {
}
