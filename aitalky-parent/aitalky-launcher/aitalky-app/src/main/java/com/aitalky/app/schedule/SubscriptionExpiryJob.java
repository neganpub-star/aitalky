package com.aitalky.app.schedule;

import com.aitalky.billing.service.BillingService;
import com.aitalky.framework.lock.DistributedLockTemplate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 订阅到期处理(定时任务)。把已过期(expire_time<now)且仍有效的订阅置为过期(status=0)。
 * <p>多实例去重同 {@link CloseIdleConversationJob}:tryExecute 抢锁,只放行一个实例。
 * <p>降级语义:订阅 status=0 后,概览显示已过期;配额校验/功能可在各处按 status 拦截(后续按需接)。
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class SubscriptionExpiryJob {

    private static final String LOCK_KEY = "lock:job:subscription-expiry";

    private final DistributedLockTemplate lockTemplate;
    private final BillingService billingService;

    /** 每 10 分钟扫描一次(到期是天级精度,无需高频) */
    @Scheduled(cron = "${aitalky.job.subscription-expiry.cron:0 */10 * * * ?}")
    public void run() {
        lockTemplate.tryExecute(LOCK_KEY, 120, () -> {
            int n = billingService.expireOverdueSubscriptions();
            if (n > 0) {
                log.info("订阅到期处理完成, 置过期 {} 条", n);
            }
        });
    }
}
