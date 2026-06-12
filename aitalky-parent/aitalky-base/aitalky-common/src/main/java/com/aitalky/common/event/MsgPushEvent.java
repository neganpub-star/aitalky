package com.aitalky.common.event;

import java.io.Serializable;

/**
 * 消息推送事件:app 落库后发 RocketMQ,ws 消费后推给目标连接。
 * 放在 common 以便 app(发布)与 ws(消费)共用,ws 无需依赖业务模块。
 * payload 为已序列化的消息 JSON(客户端直接收;含 msgId/seq 供排序去重)。
 */
public record MsgPushEvent(
        Long conversationId,
        Long projectId,
        Long assigneeMemberId,
        Long customerId,
        String payload) implements Serializable {

    /** RocketMQ 主题 */
    public static final String TOPIC = "ws-msg-push";
}
