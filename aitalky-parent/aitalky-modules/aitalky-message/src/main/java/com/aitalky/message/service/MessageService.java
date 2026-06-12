package com.aitalky.message.service;

import com.aitalky.message.document.Message;
import com.aitalky.message.dto.SendMessageCmd;

import java.util.List;

/** 消息服务 */
public interface MessageService {

    /** 发送:分配会话内单调 seq → 落库(先持久化,再由上层推 WS) */
    Message send(SendMessageCmd cmd);

    /** 打开会话首屏:最近 limit 条(返回按 seq 升序) */
    List<Message> loadLatest(Long conversationId, int limit);

    /** 增量同步/补拉:seq 之后的消息(升序) */
    List<Message> sync(Long conversationId, long afterSeq);

    /**
     * 按内容搜索命中的会话id(去重)。仅本项目、可见(未撤回)、非内部消息。
     * @param keyword 关键词(按字面量匹配,自动转义特殊字符)
     * @param limit   命中会话上限(防止超大结果)
     */
    List<Long> searchConversationIds(Long projectId, String keyword, int limit);

    /**
     * 撤回消息:校验"本人发送"+ 时限(默认2分钟),置 isVisible=false(幂等)。
     * @param operatorType 发起方类型 agent/customer;operatorId 对应 memberId/customerId
     * @return 撤回后的消息(isVisible=false),供上层推 WS
     */
    Message retract(Long conversationId, Long msgId, String operatorType, Long operatorId);
}
