package com.aitalky.platform.dto;

/**
 * 平台参数(后管参数管理列表项)。
 */
public record ConfigVO(
        Long id,
        String configKey,
        String configValue,
        String name,
        String remark,
        String configGroup,
        Integer status
) {
}
