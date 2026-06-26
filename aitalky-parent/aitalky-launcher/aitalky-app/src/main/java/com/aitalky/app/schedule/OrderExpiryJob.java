package com.aitalky.app.schedule;

import com.aitalky.billing.service.BillingOrderService;
import com.aitalky.framework.lock.DistributedLockTemplate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 待支付订单超时作废(定时任务)。把已超时(expire_time<now)且仍待支付(status=0)的订单置为作废(status=2)。
 * <p>读取待支付时已有懒过期兜底,此 Job 保证即使无人访问 DB 也保持干净、解除"已有待支付"对新单的阻塞。
 * <p>多实例去重同 {@link SubscriptionExpiryJob}:tryExecute 抢锁,只放行一个实例。
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class OrderExpiryJob {

    private static final String LOCK_KEY = "lock:job:order-expiry";

    private final DistributedLockTemplate lockTemplate;
    private final BillingOrderService orderService;

    /** 每 5 分钟扫描一次(支付有效期天级,5 分钟精度足够) */
    @Scheduled(cron = "${aitalky.job.order-expiry.cron:0 */5 * * * ?}")
    public void run() {
        lockTemplate.tryExecute(LOCK_KEY, 120, () -> {
            int n = orderService.expireOverduePendingOrders();
            if (n > 0) {
                log.info("待支付订单超时作废完成, 处理 {} 条", n);
            }
        });
    }
}
