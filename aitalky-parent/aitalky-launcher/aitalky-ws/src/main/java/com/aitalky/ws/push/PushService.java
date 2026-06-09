package com.aitalky.ws.push;

import com.aitalky.ws.registry.ConnectionRegistry;
import io.netty.channel.Channel;
import io.netty.handler.codec.http.websocketx.TextWebSocketFrame;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.Set;

/**
 * 推送服务（多端 + 代看/代发，直击 cicada 痛点）。
 * <p>一条会话消息的推送目标 = <b>assignee 坐席的全部连接</b> ∪ <b>会话订阅者的全部连接</b>：
 * <ul>
 *   <li>负责人代看：其连接已订阅该会话 → 自动在订阅者集合里收到（无需补推补丁）</li>
 *   <li>负责人代发：消息归 assignee → 推 assignee 全部连接 + 全部订阅者 →
 *       <b>坐席本人各端 + 代发的负责人都收到</b>，客户端按 msgId 去重</li>
 *   <li>客户多端：推该客户的全部连接</li>
 * </ul>
 * <p>横向扩展：目标连接可能分布在不同实例。本地连接直接 write；
 * 非本实例的连接通过 RocketMQ 广播（见 {@code TODO}），由目标实例消费后本地下发。
 */
@Slf4j
@Service
public class PushService {

    private final ConnectionRegistry registry;

    public PushService(ConnectionRegistry registry) {
        this.registry = registry;
    }

    /**
     * 向一条会话的所有相关端推送。
     *
     * @param conversationId  会话 id
     * @param assigneeMemberId 负责坐席 id（代发也归这里）
     * @param payloadJson     已序列化的消息 JSON（含 msgId/seq，供客户端排序去重）
     */
    public void pushToConversation(long conversationId, Long assigneeMemberId, String payloadJson) {
        Set<String> targets = new HashSet<>(registry.subscribersOf(String.valueOf(conversationId)));
        if (assigneeMemberId != null) {
            targets.addAll(registry.connectionsOf("member:" + assigneeMemberId));
        }
        dispatch(targets, payloadJson);
    }

    /** 向某身份（成员/客户）的全部连接推送，例：member:123 / cust:456 */
    public void pushToIdentity(String identity, String payloadJson) {
        dispatch(registry.connectionsOf(identity), payloadJson);
    }

    /** 把消息分发到一组连接节点（实例#connId）：本实例直推，跨实例走 MQ 广播 */
    private void dispatch(Set<String> nodes, String payloadJson) {
        log.debug("dispatch 目标连接数={}", nodes.size());
        for (String node : nodes) {
            int sep = node.indexOf('#');
            if (sep < 0) {
                continue;
            }
            String instance = node.substring(0, sep);
            String connId = node.substring(sep + 1);
            if (registry.getInstanceId().equals(instance)) {
                Channel ch = registry.localChannel(connId);
                if (ch != null && ch.isActive()) {
                    ch.writeAndFlush(new TextWebSocketFrame(payloadJson));
                }
            } else {
                // TODO 跨实例：发 RocketMQ（topic=ws-push, tag=instance）→ 目标实例消费后本地下发该 connId
                log.debug("跨实例推送（待接 MQ）target={}, instance={}", connId, instance);
            }
        }
    }
}
