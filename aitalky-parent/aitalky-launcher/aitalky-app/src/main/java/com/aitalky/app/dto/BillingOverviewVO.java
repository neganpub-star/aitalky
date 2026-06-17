package com.aitalky.app.dto;

import com.aitalky.platform.dto.PlanQuotaVO;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 服务订阅概览(对齐 ByteTrack 概览页)。
 * subscribed=false 时其余字段为 null,前端显示「未订阅,去订阅」。
 * quotas=当前套餐资源配额(总量/无限制);features=功能项(收件箱/信使/域名私有化等,勾);
 * used 已用量第⑤期接真实数据,本期为 null。
 */
public record BillingOverviewVO(
        boolean subscribed,
        Long planId,
        String planCode,
        String planName,
        Integer planLevel,
        LocalDateTime expireTime,
        boolean expired,
        List<PlanQuotaVO> quotas,
        List<String> features
) {
}
