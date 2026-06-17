package com.aitalky.billing.service.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 后管订单(跨项目)。projectName 由 admin 层关联填充(billing 不依赖 identity 取项目名)。
 */
public record AdminOrderVO(
        Long id,
        String orderNo,
        Long projectId,
        String projectName,
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
    /** 覆盖项目名(关联填充用) */
    public AdminOrderVO withProjectName(String name) {
        return new AdminOrderVO(id, orderNo, projectId, name, type, planId, planName,
                months, seats, amount, currency, status, paidTime, createTime);
    }
}
