package com.aitalky.admin.dto;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;

/**
 * 后管手动开通/调整订阅(送试用)。
 *
 * @param planId         套餐id
 * @param seats          加购席位(套餐自带之外,≥0;null 视为 0)
 * @param extraCustomers 加购客户配额(套餐自带之外,≥0;null 视为 0)
 * @param expireTime     到期时间
 */
public record GrantSubscriptionCmd(
        @NotNull Long planId,
        Integer seats,
        Integer extraCustomers,
        @NotNull LocalDateTime expireTime
) {
}
