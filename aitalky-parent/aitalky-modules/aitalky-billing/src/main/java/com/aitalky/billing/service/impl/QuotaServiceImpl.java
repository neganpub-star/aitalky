package com.aitalky.billing.service.impl;

import com.aitalky.billing.entity.BilProjectResource;
import com.aitalky.billing.entity.BilSubscription;
import com.aitalky.billing.mapper.BilProjectResourceMapper;
import com.aitalky.billing.mapper.BilSubscriptionMapper;
import com.aitalky.billing.service.QuotaService;
import com.aitalky.billing.service.dto.QuotaLimit;
import com.aitalky.common.api.ResultCode;
import com.aitalky.common.exception.BizException;
import com.aitalky.platform.dto.PlanQuotaVO;
import com.aitalky.platform.dto.PlanVO;
import com.aitalky.platform.service.ConfigService;
import com.aitalky.platform.service.PlanService;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * 资源配额统一实现。limit 计算只依赖 billing(订阅/永久包)+ platform(套餐/参数),
 * 不依赖 identity/customer 模块,避免循环依赖;used 由调用方传入。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class QuotaServiceImpl implements QuotaService {

    private final BilSubscriptionMapper subscriptionMapper;
    private final BilProjectResourceMapper resourceMapper;
    private final PlanService planService;
    private final ConfigService configService;

    @Override
    public QuotaLimit limit(Long projectId, String resourceType) {
        // 永久加量包:免费默认值 + 已购量(与订阅无关)
        switch (resourceType) {
            case "customer" -> { return packLimit(projectId, resourceType, "default_customer", 100); }
            case "translate_char" -> { return packLimit(projectId, resourceType, "default_translate_char", 200); }
            case "ai_tokens" -> { return packLimit(projectId, resourceType, "default_ai_tokens", 4000); }
            default -> { /* 套餐型,下面处理 */ }
        }
        // 套餐型(seat/article/site)
        BilSubscription sub = subscription(projectId);
        if (sub == null) {
            // 未订阅:席位给 1 个免费席位(项目负责人,对齐参考基础席位=1);其它套餐型资源 0
            if ("seat".equals(resourceType)) {
                return new QuotaLimit(configService.getInt("default_seat", 1), false);
            }
            return new QuotaLimit(0, false);
        }
        PlanVO plan = planService.get(sub.getPlanId());
        long base = 0;
        boolean unlimited = false;
        if (plan != null && plan.quotas() != null) {
            for (PlanQuotaVO q : plan.quotas()) {
                if (resourceType.equals(q.resourceType())) {
                    unlimited = q.isUnlimited() != null && q.isUnlimited() == 1;
                    base = q.amount() == null ? 0 : q.amount();
                }
            }
        }
        // 席位:套餐配额 + 加购席位
        if ("seat".equals(resourceType)) {
            base += sub.getSeats() == null ? 0 : sub.getSeats();
        }
        return new QuotaLimit(base, unlimited);
    }

    /** 永久加量包总量 = 免费默认值 + 已购量 */
    private QuotaLimit packLimit(Long projectId, String resourceType, String cfgKey, int def) {
        long base = configService.getInt(cfgKey, def);
        return new QuotaLimit(base + purchased(projectId, resourceType), false);
    }

    private long purchased(Long projectId, String resourceType) {
        BilProjectResource r = resourceMapper.selectOne(Wrappers.<BilProjectResource>lambdaQuery()
                .eq(BilProjectResource::getProjectId, projectId)
                .eq(BilProjectResource::getResourceType, resourceType)
                .last("limit 1"));
        return r == null || r.getPurchasedAmount() == null ? 0 : r.getPurchasedAmount();
    }

    private BilSubscription subscription(Long projectId) {
        return subscriptionMapper.selectOne(Wrappers.<BilSubscription>lambdaQuery()
                .eq(BilSubscription::getProjectId, projectId).last("limit 1"));
    }

    @Override
    public boolean hasRemaining(Long projectId, String resourceType, long currentUsed, long need) {
        QuotaLimit l = limit(projectId, resourceType);
        return l.unlimited() || currentUsed + need <= l.limit();
    }

    @Override
    public void ensure(Long projectId, String resourceType, long currentUsed, long need) {
        if (!hasRemaining(projectId, resourceType, currentUsed, need)) {
            log.warn("资源配额不足, projectId={}, type={}, used={}, need={}", projectId, resourceType, currentUsed, need);
            throw new BizException(ResultCode.RESOURCE_QUOTA_EXCEEDED);
        }
    }

    @Override
    public void grantPack(Long projectId, String resourceType, long amount) {
        if (amount <= 0) {
            return;
        }
        // 调用方多在按项目加锁的核销事务内,先累加;无行则新增(insertFill 注入雪花ID)
        if (resourceMapper.incrAmount(projectId, resourceType, amount) == 0) {
            insertRow(projectId, resourceType, amount);
        }
    }

    @Override
    public void setPack(Long projectId, String resourceType, long amount) {
        if (resourceMapper.setAmount(projectId, resourceType, Math.max(0, amount)) == 0) {
            insertRow(projectId, resourceType, Math.max(0, amount));
        }
    }

    private void insertRow(Long projectId, String resourceType, long amount) {
        BilProjectResource r = new BilProjectResource();
        r.setProjectId(projectId);
        r.setResourceType(resourceType);
        r.setPurchasedAmount(amount);
        resourceMapper.insert(r);
    }
}
