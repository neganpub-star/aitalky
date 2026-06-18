package com.aitalky.admin.dto;

import com.aitalky.platform.dto.PlanQuotaVO;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 后管查看的项目订阅详情(订阅情况 + 资源用量)。
 *
 * @param subscribed      是否有订阅记录
 * @param expired         是否已过期
 * @param seats           加购席位(套餐自带之外)
 * @param extraCustomers  加购客户配额(套餐自带之外)
 * @param seatUsed        已用席位(启用成员数)
 * @param seatTotal       席位总额(套餐席位 + 加购;无限时为 -1)
 * @param customerUsed    已用客户数
 * @param customerTotal   客户配额总额(套餐 + 加购客户配额;无限时为 -1)
 * @param quotas          套餐配额明细(seat/article/site/customer/translate_char...)
 * @param freeTrialDays   后管参数 free_trial_days(试用快捷按钮默认天数)
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
        Integer extraCustomers,
        long seatUsed,
        long seatTotal,
        long customerUsed,
        long customerTotal,
        List<PlanQuotaVO> quotas,
        int freeTrialDays
) {
}
