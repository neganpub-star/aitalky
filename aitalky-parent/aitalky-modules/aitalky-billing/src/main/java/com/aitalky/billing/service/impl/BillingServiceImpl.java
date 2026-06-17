package com.aitalky.billing.service.impl;

import com.aitalky.billing.entity.BilSubscription;
import com.aitalky.billing.mapper.BilSubscriptionMapper;
import com.aitalky.billing.service.BillingService;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/** 订阅计费实现。project_id 由多租户拦截器自动过滤;此处显式按 projectId 查以兼容无上下文调用 */
@Service
@RequiredArgsConstructor
public class BillingServiceImpl implements BillingService {

    private final BilSubscriptionMapper subscriptionMapper;

    @Override
    public BilSubscription getSubscription(Long projectId) {
        return subscriptionMapper.selectOne(Wrappers.<BilSubscription>lambdaQuery()
                .eq(BilSubscription::getProjectId, projectId).last("limit 1"));
    }
}
