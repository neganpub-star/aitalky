package com.aitalky.identity.dto;

/**
 * 系统推送设置(对齐参考系统:4 类消息 x APP/Web 共 8 个开关)。
 * <p>1=开 0=关。读写都用本结构。
 */
public record PushSettingsVO(
        Integer assignedApp, Integer assignedWeb,
        Integer unassignedApp, Integer unassignedWeb,
        Integer mentionApp, Integer mentionWeb,
        Integer newCustomerApp, Integer newCustomerWeb) {
}
