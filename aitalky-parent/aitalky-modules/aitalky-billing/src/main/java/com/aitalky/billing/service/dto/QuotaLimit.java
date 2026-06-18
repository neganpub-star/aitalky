package com.aitalky.billing.service.dto;

/**
 * 资源配额上限。
 *
 * @param limit     总量(unlimited=true 时无意义)
 * @param unlimited 是否无限
 */
public record QuotaLimit(long limit, boolean unlimited) {
}
