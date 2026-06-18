package com.aitalky.admin.dto;

import com.aitalky.platform.dto.PlanQuotaVO;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 后管查看的项目订阅详情(订阅情况 + 资源用量)。资源总量统一走 QuotaService;-1 表示无限。
 * <p>客户/翻译/Tokens 为永久加量包(脱离订阅,后管用「调整扩展额度」单独操作)。
 *
 * @param seats          当前加购席位(套餐自带之外;手动开通表单回填)
 * @param seatTotal      席位总量(套餐席位 + 加购;无限=-1)
 * @param customerTotal  客户配额总量(免费默认 + 已购包)
 * @param translateTotal 翻译字符总量(免费默认 + 已购包)
 * @param aiTokensTotal  AI Tokens 总量(免费默认 + 已购包)
 * @param freeTrialDays  后管参数 free_trial_days(试用快捷按钮默认天数)
 */
public record ProjectSubscriptionVO(
        boolean subscribed,
        Long planId,
        String planCode,
        String planName,
        Integer status,
        LocalDateTime expireTime,
        boolean expired,
        Integer seats,
        long seatUsed,
        long seatTotal,
        long customerUsed,
        long customerTotal,
        long articleTotal,
        long siteTotal,
        long translateTotal,
        long aiTokensTotal,
        List<PlanQuotaVO> quotas,
        int freeTrialDays
) {
}
