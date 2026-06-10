package com.aitalky.platform.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.List;

/**
 * 新增/编辑套餐命令。id 为空=新增,非空=编辑。
 */
public record SavePlanCmd(
        Long id,
        @NotBlank String code,
        @NotBlank String name,
        Integer level,
        @NotNull BigDecimal monthlyPrice,
        String currency,
        Integer minMonths,
        Integer isCustom,
        List<String> features,
        Integer status,
        List<PlanQuotaVO> quotas
) {
}
