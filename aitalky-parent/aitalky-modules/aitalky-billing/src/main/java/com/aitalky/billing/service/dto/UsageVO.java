package com.aitalky.billing.service.dto;

/**
 * 资源用量(概览展示:席位/客户 已用 vs 配额)。
 *
 * @param resourceType 资源类型 seat/customer
 * @param used         已用量(席位=成员数,客户=客户数,真实计量)
 * @param limit        配额上限(unlimited=true 时无意义)
 * @param unlimited    是否无限
 */
public record UsageVO(String resourceType, long used, long limit, boolean unlimited) {
}
