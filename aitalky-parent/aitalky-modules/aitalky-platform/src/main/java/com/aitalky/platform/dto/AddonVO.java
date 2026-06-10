package com.aitalky.platform.dto;

import java.math.BigDecimal;

/**
 * 加量包详情。
 */
public record AddonVO(
        Long id,
        String code,
        String name,
        String resourceType,
        Long specAmount,
        BigDecimal price,
        String currency,
        Integer status
) {
}
