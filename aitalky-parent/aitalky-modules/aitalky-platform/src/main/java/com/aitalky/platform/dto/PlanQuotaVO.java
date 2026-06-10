package com.aitalky.platform.dto;

/**
 * 套餐资源配额(展示/编辑用)。
 *
 * @param resourceType 资源类型 seat/translate_char/customer
 * @param amount       配额数量
 * @param isUnlimited  是否无限 1是
 */
public record PlanQuotaVO(
        String resourceType,
        Long amount,
        Integer isUnlimited
) {
}
