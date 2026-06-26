package com.aitalky.platform.dto;

/**
 * 参数新增/编辑入参(后管参数管理)。
 *
 * @param configKey   参数键(全局唯一;业务代码按此读取)
 * @param configValue 参数值
 * @param name        显示名称
 * @param remark      说明
 */
public record ConfigSaveCmd(
        String configKey,
        String configValue,
        String name,
        String remark
) {
}
