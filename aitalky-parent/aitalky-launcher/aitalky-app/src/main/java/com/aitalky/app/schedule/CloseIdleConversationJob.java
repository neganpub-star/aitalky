package com.aitalky.app.schedule;

import com.aitalky.app.service.AssignNotifier;
import com.aitalky.conversation.service.ConversationService;
import com.aitalky.framework.lock.DistributedLockTemplate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * 保持期自动结束会话(定时任务)。
 * <p><b>多实例去重(横向扩展关键)</b>:每个实例都有 {@code @Scheduled} 会到点触发,
 * 但用分布式锁 {@link DistributedLockTemplate#tryExecute} 保证<strong>同一时刻只有抢到锁的实例真正执行</strong>;
 * 其余实例 tryLock 立即失败、静默跳过(不抛异常、不重复处理)。leaseSec=50 < 周期 60s,避免任务卡死后锁不释放。
 * 生产可替换为 XXL-Job 等分布式调度。
 * <p>同类任务:订单支付超时关单、订阅到期处理。
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class CloseIdleConversationJob {

    private static final String LOCK_KEY = "lock:job:close-idle-conversation";

    private final DistributedLockTemplate lockTemplate;
    private final ConversationService conversationService;
    private final AssignNotifier assignNotifier;

    /** 每分钟扫描一次(cron 可配置化) */
    @Scheduled(cron = "${aitalky.job.close-idle.cron:0 * * * * ?}")
    public void run() {
        // 抢不到锁直接跳过(多实例下只放行一个实例执行)
        lockTemplate.tryExecute(LOCK_KEY, 50, () -> {
            // 1) 跨项目扫描:把开启保持期且空闲超时的进行中会话置为已结束
            List<com.aitalky.conversation.entity.CnvConversation> closed = conversationService.autoCloseIdleConversations();
            // 2) 每条发「会话超时结束」系统消息(坐席端实时上屏 + 列表预览)
            java.util.Set<Long> projects = new java.util.HashSet<>();
            for (com.aitalky.conversation.entity.CnvConversation conv : closed) {
                assignNotifier.notifyTimeoutClosed(conv);
                projects.add(conv.getProjectId());
            }
            // 3) 结束会话释放了坐席容量 → 按项目消费等待队列,把等待会话分给空出的坐席并发系统消息
            for (Long projectId : projects) {
                conversationService.consumeWaitingQueue(projectId)
                        .forEach(r -> assignNotifier.notifyAssigned(r.conversation(), r.autoAssignedMemberId()));
            }
        });
    }
}
