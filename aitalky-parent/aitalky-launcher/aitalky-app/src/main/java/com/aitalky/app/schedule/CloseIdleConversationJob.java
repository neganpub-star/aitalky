package com.aitalky.app.schedule;

import com.aitalky.framework.lock.DistributedLockTemplate;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 分布式定时样例：保持期自动结束会话。
 * <p><b>横向扩展关键</b>：多实例都有 {@code @Scheduled}，但用分布式锁保证<strong>同一时刻只有一个实例真正执行</strong>，
 * 避免重复处理。生产可替换为 XXL-Job 等分布式调度。
 * <p>同类任务：订单支付超时关单、订阅到期处理。
 */
@Slf4j
@Component
public class CloseIdleConversationJob {

    private static final String LOCK_KEY = "lock:job:close-idle-conversation";

    private final DistributedLockTemplate lockTemplate;

    public CloseIdleConversationJob(DistributedLockTemplate lockTemplate) {
        this.lockTemplate = lockTemplate;
    }

    /** 每分钟扫描一次（cron 可配置化） */
    @Scheduled(cron = "${aitalky.job.close-idle.cron:0 * * * * ?}")
    public void run() {
        // 抢不到锁直接跳过（leaseSec=50 < 周期 60s，避免任务卡死锁不释放）
        lockTemplate.execute(LOCK_KEY, 0, 50, () -> {
            log.info("【定时】扫描保持期超时会话并自动结束（仅当前持锁实例执行）");
            // TODO 接 conversation 模块：查 auto_close_idle 到期的会话 → 置 closed + 记 assign_log
        });
    }
}
