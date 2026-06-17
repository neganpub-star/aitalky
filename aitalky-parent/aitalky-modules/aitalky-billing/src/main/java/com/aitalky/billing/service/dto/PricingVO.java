package com.aitalky.billing.service.dto;

import java.math.BigDecimal;

/**
 * 计费单价(下单弹窗实时算合计用)。
 *
 * @param seatMonthlyPrice 单席位月价(席位加量包 price/specAmount;0=未配置席位加量包)
 */
public record PricingVO(BigDecimal seatMonthlyPrice) {
}
