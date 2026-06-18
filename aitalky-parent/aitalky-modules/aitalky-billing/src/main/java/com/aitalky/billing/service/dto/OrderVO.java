package com.aitalky.billing.service.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 订单(下单返回/订单记录展示)。
 *
 * @param status       0待支付 1已完成 2已作废
 * @param type         new新购/renew续费/upgrade升级/addon_seat席位加购/addon_customer客户配额加购
 * @param resourceType 加购资源类型 seat/customer;套餐单为 null
 * @param quantity     客户配额加购:新增配额总数(套餐/席位单为0)
 * @param addonPacks   订阅/续费单搭售的加量包(resourceType:包数,逗号分隔;无则 null)
 * @param periodDays   席位加购计价周期=下单时剩余天数(套餐/客户单为0)
 */
public record OrderVO(
        Long id,
        String orderNo,
        String type,
        String resourceType,
        Long planId,
        String planName,
        Integer months,
        Integer seats,
        Integer quantity,
        String addonPacks,
        Integer periodDays,
        BigDecimal amount,
        String currency,
        String payCurrency,
        Integer status,
        LocalDateTime expireTime,
        LocalDateTime paidTime,
        LocalDateTime createTime
) {
}
