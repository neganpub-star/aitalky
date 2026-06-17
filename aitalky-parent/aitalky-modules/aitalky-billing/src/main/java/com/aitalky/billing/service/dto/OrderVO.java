package com.aitalky.billing.service.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 订单(下单返回/订单记录展示)。
 *
 * @param status 0待支付 1已完成 2已作废
 * @param type   new新购/renew续费/upgrade升级
 */
public record OrderVO(
        Long id,
        String orderNo,
        String type,
        Long planId,
        String planName,
        Integer months,
        Integer seats,
        BigDecimal amount,
        String currency,
        Integer status,
        LocalDateTime paidTime,
        LocalDateTime createTime
) {
}
