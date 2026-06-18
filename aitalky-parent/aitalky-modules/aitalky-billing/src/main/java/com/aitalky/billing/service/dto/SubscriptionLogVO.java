package com.aitalky.billing.service.dto;

import java.time.LocalDateTime;

/**
 * 订阅操作日志(后管手动开通/停用)。
 *
 * @param action grant 手动开通 / cancel 停用
 */
public record SubscriptionLogVO(
        Long id,
        String action,
        String planName,
        Integer seats,
        Integer extraCustomers,
        LocalDateTime expireTime,
        LocalDateTime createTime
) {
}
