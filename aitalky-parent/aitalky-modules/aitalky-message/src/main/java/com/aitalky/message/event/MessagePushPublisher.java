package com.aitalky.message.event;

import com.aitalky.common.event.MsgPushEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.rocketmq.spring.core.RocketMQTemplate;
import org.springframework.stereotype.Component;

/**
 * 消息推送发布器:把推送事件发到 RocketMQ(按 conversationId 顺序消息,保证同会话有序),
 * 由 aitalky-ws 消费后下发到目标连接。
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class MessagePushPublisher {

    private final RocketMQTemplate rocketMQTemplate;

    public void publish(MsgPushEvent event) {
        try {
            // 顺序消息:同一会话进同一队列,单线程顺序消费 → 不乱序
            rocketMQTemplate.syncSendOrderly(MsgPushEvent.TOPIC, event, String.valueOf(event.conversationId()));
        } catch (Exception e) {
            // 推送失败不影响消息已落库;客户端可在重连时按 seq 补拉
            log.warn("消息推送发布失败 conversationId={}, 原因={}", event.conversationId(), e.getMessage());
        }
    }
}
