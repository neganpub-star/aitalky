package com.aitalky.billing.service;

import com.aitalky.billing.service.dto.QuotaLimit;

/**
 * 资源配额统一服务(公共校验入口,便于维护)。
 * <p>口径:
 * <ul>
 *   <li>套餐型(seat/article/site):有订阅则 = 套餐配额(席位再加 sub.seats);未订阅 = 0。</li>
 *   <li>永久加量包(customer/translate_char/ai_tokens):= 免费默认值(参数 default_*) + 已购加量包(bil_project_resource),与订阅无关。</li>
 * </ul>
 * <p>{@code used} 不在本服务内取(避免 billing 反向依赖 identity/customer 模块);
 * 由调用方传入当前已用量(各模块自己最清楚,如启用成员数/客户数)。
 */
public interface QuotaService {

    /** 资源总量上限(limit/unlimited);不含已用量 */
    QuotaLimit limit(Long projectId, String resourceType);

    /** 是否还够 need:无限或 currentUsed+need ≤ limit */
    boolean hasRemaining(Long projectId, String resourceType, long currentUsed, long need);

    /** 校验配额:不够则抛 BizException(RESOURCE_QUOTA_EXCEEDED)。消费资源(加成员/建客户)前统一调用 */
    void ensure(Long projectId, String resourceType, long currentUsed, long need);

    /** 发放永久加量包配额(订单核销时调,累加) */
    void grantPack(Long projectId, String resourceType, long amount);

    /** 覆盖设置永久加量包配额(后管手动调整额度用) */
    void setPack(Long projectId, String resourceType, long amount);
}
