package com.aitalky.message.service.impl;

import com.aitalky.common.id.SnowflakeIdGenerator;
import com.aitalky.message.document.Message;
import com.aitalky.message.dto.SendMessageCmd;
import com.aitalky.message.repository.MessageRepository;
import com.aitalky.message.service.MessageService;
import lombok.RequiredArgsConstructor;
import org.redisson.api.RedissonClient;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/**
 * 消息服务实现。seq 用 Redisson 原子自增保证会话内单调(跨实例不重复)。
 */
@Service
@RequiredArgsConstructor
public class MessageServiceImpl implements MessageService {

    private final MessageRepository messageRepository;
    private final RedissonClient redisson;
    private final SnowflakeIdGenerator idGenerator;

    @Override
    public Message send(SendMessageCmd cmd) {
        long seq = redisson.getAtomicLong("conv:seq:" + cmd.conversationId()).incrementAndGet();
        Message m = new Message();
        m.setMsgId(idGenerator.nextId());
        m.setSeq(seq);
        m.setProjectId(cmd.projectId());
        m.setConversationId(cmd.conversationId());
        m.setCustomerId(cmd.customerId());
        m.setSenderType(cmd.senderType());
        m.setSenderId(cmd.senderId());
        m.setSenderName(cmd.senderName());
        m.setSenderAvatar(cmd.senderAvatar());
        m.setType(cmd.type() == null ? "text" : cmd.type());
        m.setContent(cmd.content());
        m.setIsRead(false);
        m.setIsVisible(true);
        m.setInternal(Boolean.TRUE.equals(cmd.internal()));
        m.setMentions(cmd.mentions());
        m.setTimestamp(System.currentTimeMillis());
        return messageRepository.save(m);
    }

    @Override
    public List<Message> loadLatest(Long conversationId, int limit) {
        // 倒序取最近 limit 条,再反转为升序(显示用)
        List<Message> desc = messageRepository.findByConversationIdOrderBySeqDesc(
                conversationId, PageRequest.of(0, limit));
        List<Message> asc = new ArrayList<>(desc);
        java.util.Collections.reverse(asc);
        return asc;
    }

    @Override
    public List<Message> sync(Long conversationId, long afterSeq) {
        return messageRepository.findByConversationIdAndSeqGreaterThanOrderBySeqAsc(conversationId, afterSeq);
    }
}
