package com.aitalky.ws.push;

import com.aitalky.common.event.MsgPushEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.rocketmq.spring.annotation.MessageModel;
import org.apache.rocketmq.spring.annotation.RocketMQMessageListener;
import org.apache.rocketmq.spring.core.RocketMQListener;
import org.springframework.stereotype.Component;

/**
 * 消费 app 发来的消息推送事件,下发到本实例持有的目标连接。
 * <p>目标 = 坐席侧(assignee 全部连接 ∪ 会话订阅者) + 客户全部连接(代看/代发由订阅天然覆盖)。
 * <p><b>广播消费(BROADCASTING)</b>:每个 ws 实例都消费每条事件,各自只下发到<b>本实例本地连接</b>
 * (非本地节点交给其所在实例的广播副本处理)。这样横向扩展(多 ws 实例)时无需跨实例转发,
 * 连接只属于唯一实例 → 恰好被那一台投递,既不漏推也不重复。
 * <p>注:广播模式 offset 各实例本地存,实例宕机期间漏的帧由客户端重连按 seq 补偿(漏消息补偿设计),不依赖 MQ 回放。
 */
@Slf4j
@Component
@RequiredArgsConstructor
@RocketMQMessageListener(topic = MsgPushEvent.TOPIC, consumerGroup = "aitalky-ws-push",
        messageModel = MessageModel.BROADCASTING)
public class MessagePushListener implements RocketMQListener<MsgPushEvent> {

    private final PushService pushService;

    @Override
    public void onMessage(MsgPushEvent event) {
        log.info("收到推送事件 conversationId={}, assignee={}, customerId={}",
                event.conversationId(), event.assigneeMemberId(), event.customerId());
        // 坐席:assignee + 会话订阅者 + 项目频道(全部坐席,保证"全部/未分配"视图实时);
        // 三者合并为一个连接集合,单次去重下发——同一连接(既是assignee又在项目频道/订阅)只收一次,杜绝重复帧
        pushService.pushToAgents(event.conversationId(), event.assigneeMemberId(), event.projectId(), event.payload());
        // 客户:其全部连接(internal 消息时 customerId 为空,跳过)
        if (event.customerId() != null) {
            pushService.pushToIdentity("cust:" + event.customerId(), event.payload());
        }
    }
}
