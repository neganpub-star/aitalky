package com.aitalky.platform.dto;

import java.math.BigDecimal;
import java.util.List;

/**
 * 套餐详情(含资源配额列表)。
 */
public record PlanVO(
        Long id,
        String code,
        String name,
        Integer level,
        BigDecimal monthlyPrice,
        String currency,
        Integer minMonths,
        Integer isCustom,
        List<String> features,
        Integer status,
        List<PlanQuotaVO> quotas
) {
}
