package com.aitalky.billing.service.dto;

import java.math.BigDecimal;

/**
 * 后管订单统计(跨项目,全局口径,不随列表筛选变化)。
 *
 * @param totalOrders   订单总数(含作废)
 * @param paidOrders    已完成订单数(status=1)
 * @param pendingOrders 待支付订单数(status=0)
 * @param paidAmount    累计成交额=已完成订单金额合计(当前均为 USDT 稳定币)
 * @param currency      金额币种(固定 USDT)
 */
public record OrderStatsVO(
        long totalOrders,
        long paidOrders,
        long pendingOrders,
        BigDecimal paidAmount,
        String currency
) {
}
