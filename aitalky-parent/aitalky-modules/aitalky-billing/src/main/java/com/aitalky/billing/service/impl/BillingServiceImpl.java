package com.aitalky.billing.service.impl;

import com.aitalky.billing.entity.BilSubscription;
import com.aitalky.billing.entity.BilSubscriptionLog;
import com.aitalky.billing.mapper.BilSubscriptionLogMapper;
import com.aitalky.billing.mapper.BilSubscriptionMapper;
import com.aitalky.billing.service.BillingService;
import com.aitalky.billing.service.dto.SubscriptionLogVO;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

/** 订阅计费实现。project_id 由多租户拦截器自动过滤;此处显式按 projectId 查以兼容无上下文调用 */
@Slf4j
@Service
@RequiredArgsConstructor
public class BillingServiceImpl implements BillingService {

    private final BilSubscriptionMapper subscriptionMapper;
    private final BilSubscriptionLogMapper logMapper;

    @Override
    public BilSubscription getSubscription(Long projectId) {
        return subscriptionMapper.selectOne(Wrappers.<BilSubscription>lambdaQuery()
                .eq(BilSubscription::getProjectId, projectId).last("limit 1"));
    }

    @Override
    public void grantSubscription(Long projectId, Long planId, String planCode, String planName,
                                  Integer seats, LocalDateTime expireTime, Long operator) {
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
        // 客户配额已改为项目级永久包(bil_project_resource),不再挂订阅;extra_customers 字段废弃保持 0
        sub.setExtraCustomers(0);
        sub.setExpireTime(expireTime);
        sub.setStatus(1);
        if (isNew) {
            subscriptionMapper.insert(sub);
        } else {
            subscriptionMapper.updateById(sub);
        }
        log.info("后管手动开通订阅, projectId={}, planId={}, seats={}, expire={}",
                projectId, planId, seats, expireTime);
        BilSubscriptionLog logRow = new BilSubscriptionLog();
        logRow.setProjectId(projectId);
        logRow.setAction("grant");
        logRow.setPlanName(planName);
        logRow.setSeats(seats == null ? 0 : seats);
        logRow.setExtraCustomers(0);
        logRow.setExpireTime(expireTime);
        logRow.setOperator(operator);
        logMapper.insert(logRow);
    }

    @Override
    public void cancelSubscription(Long projectId, Long operator) {
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
        BilSubscriptionLog logRow = new BilSubscriptionLog();
        logRow.setProjectId(projectId);
        logRow.setAction("cancel");
        logRow.setOperator(operator);
        logMapper.insert(logRow);
    }

    @Override
    public List<SubscriptionLogVO> listSubscriptionLogs(Long projectId) {
        return logMapper.selectList(Wrappers.<BilSubscriptionLog>lambdaQuery()
                        .eq(BilSubscriptionLog::getProjectId, projectId)
                        .orderByDesc(BilSubscriptionLog::getCreateTime))
                .stream().map(l -> new SubscriptionLogVO(l.getId(), l.getAction(), l.getPlanName(),
                        l.getSeats(), l.getExtraCustomers(), l.getExpireTime(), l.getCreateTime()))
                .toList();
    }

    @Override
    public int expireOverdueSubscriptions() {
        return subscriptionMapper.expireOverdue();
    }
}
