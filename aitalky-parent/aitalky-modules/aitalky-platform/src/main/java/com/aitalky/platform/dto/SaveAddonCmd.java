package com.aitalky.platform.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

/**
 * 新增/编辑加量包命令。id 为空=新增。
 */
public record SaveAddonCmd(
        Long id,
        @NotBlank String code,
        @NotBlank String name,
        @NotBlank String resourceType,
        @NotNull Long specAmount,
        @NotNull BigDecimal price,
        String currency,
        Integer status
) {
}
