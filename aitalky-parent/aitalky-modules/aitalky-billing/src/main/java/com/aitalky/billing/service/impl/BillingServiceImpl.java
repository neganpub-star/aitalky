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
                                  Integer seats, Integer extraCustomers, LocalDateTime expireTime) {
        BilSubscription sub = getSubscription(projectId);
        boolean isNew = sub == null;
        if (isNew) {
            sub = new BilSubscription();
            sub.setProjectId(projectId);
            sub.setStartTime(LocalDateTime.now());
        }
        // 换套餐:起算时间重置为当前(到期时间以传入为准)
        if (sub.getPlanId() == null || !sub.getPlanId().equals(planId)) {
            sub.setStartTime(LocalDateTime.now());
        }
        sub.setPlanId(planId);
        sub.setPlanCode(planCode);
        sub.setPlanName(planName);
        sub.setSeats(seats == null ? 0 : seats);
        sub.setExtraCustomers(extraCustomers == null ? 0 : extraCustomers);
        sub.setExpireTime(expireTime);
        sub.setStatus(1);
        if (isNew) {
            subscriptionMapper.insert(sub);
        } else {
            subscriptionMapper.updateById(sub);
        }
        log.info("后管手动开通订阅, projectId={}, planId={}, seats={}, extraCustomers={}, expire={}",
                projectId, planId, seats, extraCustomers, expireTime);
    }

    @Override
    public void cancelSubscription(Long projectId) {
        BilSubscription sub = getSubscription(projectId);
        if (sub == null) {
            return;
        }
        BilSubscription update = new BilSubscription();
        update.setId(sub.getId());
        update.setStatus(0);
        update.setExpireTime(LocalDateTime.now()); // 立即过期,前后端门禁一致拦截
        subscriptionMapper.updateById(update);
        log.info("后管停用项目订阅, projectId={}", projectId);
    }

    @Override
    public int expireOverdueSubscriptions() {
        return subscriptionMapper.expireOverdue();
    }
}
