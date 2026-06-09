package com.aitalky.ws.push;

import com.aitalky.common.event.MsgPushEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.rocketmq.spring.annotation.RocketMQMessageListener;
import org.apache.rocketmq.spring.core.RocketMQListener;
import org.springframework.stereotype.Component;

/**
 * 消费 app 发来的消息推送事件,下发到本实例持有的目标连接。
 * <p>目标 = 坐席侧(assignee 全部连接 ∪ 会话订阅者) + 客户全部连接(代看/代发由订阅天然覆盖)。
 */
@Slf4j
@Component
@RequiredArgsConstructor
@RocketMQMessageListener(topic = MsgPushEvent.TOPIC, consumerGroup = "aitalky-ws-push")
public class MessagePushListener implements RocketMQListener<MsgPushEvent> {

    private final PushService pushService;

    @Override
    public void onMessage(MsgPushEvent event) {
        log.info("收到推送事件 conversationId={}, assignee={}, customerId={}",
                event.conversationId(), event.assigneeMemberId(), event.customerId());
        // 坐席:assignee 全部连接 + 正在查看该会话的订阅者
        pushService.pushToConversation(event.conversationId(), event.assigneeMemberId(), event.payload());
        // 客户:其全部连接(internal 消息时 customerId 为空,跳过)
        if (event.customerId() != null) {
            pushService.pushToIdentity("cust:" + event.customerId(), event.payload());
        }
    }
}
