package com.aitalky.messenger.dto;

import java.time.LocalDateTime;

/** 黑名单列表项 */
public record BlacklistVO(
        Long id, Integer targetType, String targetValue, String reason, LocalDateTime createTime) {
}
