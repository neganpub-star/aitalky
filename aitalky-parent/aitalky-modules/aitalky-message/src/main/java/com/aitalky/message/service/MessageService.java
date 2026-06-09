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
}
