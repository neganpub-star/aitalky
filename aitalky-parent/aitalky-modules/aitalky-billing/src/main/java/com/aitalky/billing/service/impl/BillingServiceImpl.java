package com.aitalky.billing.service.impl;

import com.aitalky.billing.entity.BilSubscription;
import com.aitalky.billing.mapper.BilSubscriptionMapper;
import com.aitalky.billing.service.BillingService;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

/** 订阅计费实现。project_id 由多租户拦截器自动过滤;此处显式按 projectId 查以兼容无上下文调用 */
@Slf4j
@Service
@RequiredArgsConstructor
public class BillingServiceImpl implements BillingService {

    private final BilSubscriptionMapper subscriptionMapper;

    @Override
    public BilSubscription getSubscription(Long projectId) {
        return subscriptionMapper.selectOne(Wrappers.<BilSubscription>lambdaQuery()
                .eq(BilSubscription::getProjectId, projectId).last("limit 1"));
    }

    @Override
    public void grantSubscription(Long projectId, Long planId, String planCode, String planName,
                                  Integer seats, LocalDateTime expireTime) {
        BilSubscription sub = getSubscription(projectId);
        boolean isNew = sub == null;
        if (isNew) {
            sub = new BilSubscription();
            sub.setProjectId(projectId);
            sub.setStartTime(LocalDateTime.now());
        }
        // 换套餐:加购客户配额不跨套餐保留,重置 0(与下单 applyPlan 一致)
        if (sub.getPlanId() == null || !sub.getPlanId().equals(planId)) {
            sub.setExtraCustomers(0);
            sub.setStartTime(LocalDateTime.now());
        }
        sub.setPlanId(planId);
        sub.setPlanCode(planCode);
        sub.setPlanName(planName);
        sub.setSeats(seats == null ? 0 : seats);
        sub.setExpireTime(expireTime);
        sub.setStatus(1);
        if (isNew) {
            subscriptionMapper.insert(sub);
        } else {
            subscriptionMapper.updateById(sub);
        }
        log.info("后管手动开通订阅, projectId={}, planId={}, expire={}", projectId, planId, expireTime);
    }

    @Override
    public int expireOverdueSubscriptions() {
        return subscriptionMapper.expireOverdue();
    }
}
