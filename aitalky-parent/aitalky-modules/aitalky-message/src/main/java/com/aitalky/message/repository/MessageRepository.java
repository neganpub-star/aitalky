package com.aitalky.message.repository;

import com.aitalky.message.document.Message;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

/** 消息仓库(MongoDB) */
public interface MessageRepository extends MongoRepository<Message, String> {

    /** 按会话取增量(seq 之后),升序——用于增量同步/补拉 */
    List<Message> findByConversationIdAndSeqGreaterThanOrderBySeqAsc(Long conversationId, Long seq);

    /** 按会话取最近 N 条(seq 倒序),用于打开会话首屏 */
    List<Message> findByConversationIdOrderBySeqDesc(Long conversationId, Pageable pageable);

    /** 按会话取 seq < 指定值的最近 N 条(seq 倒序),用于历史向上翻页 */
    List<Message> findByConversationIdAndSeqLessThanOrderBySeqDesc(Long conversationId, Long seq, Pageable pageable);

    /** 按会话+业务消息ID定位单条(撤回用) */
    Optional<Message> findByConversationIdAndMsgId(Long conversationId, Long msgId);
}
