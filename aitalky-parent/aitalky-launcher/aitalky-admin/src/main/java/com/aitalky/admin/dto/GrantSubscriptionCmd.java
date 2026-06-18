package com.aitalky.admin.dto;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;

/**
 * 后管手动开通/调整订阅(送试用)。客户/翻译/Tokens 扩展额度由「调整扩展额度」单独操作,不在此处。
 *
 * @param planId     套餐id
 * @param seats      加购席位(套餐自带之外,≥0;null 视为 0)
 * @param expireTime 到期时间
 */
public record GrantSubscriptionCmd(
        @NotNull Long planId,
        Integer seats,
        @NotNull LocalDateTime expireTime
) {
}
