package com.aitalky.message.service.impl;

import com.aitalky.common.api.ResultCode;
import com.aitalky.common.exception.BizException;
import com.aitalky.common.id.SnowflakeIdGenerator;
import com.aitalky.message.document.Message;
import com.aitalky.message.dto.SendMessageCmd;
import com.aitalky.message.repository.MessageRepository;
import com.aitalky.message.service.MessageService;
import lombok.RequiredArgsConstructor;
import org.redisson.api.RedissonClient;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.regex.Pattern;

/**
 * 消息服务实现。seq 用 Redisson 原子自增保证会话内单调(跨实例不重复)。
 */
@Service
@RequiredArgsConstructor
public class MessageServiceImpl implements MessageService {

    /** 可撤回时限:2 分钟内(对齐常见即时通讯习惯) */
    private static final long RETRACT_WINDOW_MS = 2 * 60 * 1000L;

    private final MessageRepository messageRepository;
    private final RedissonClient redisson;
    private final SnowflakeIdGenerator idGenerator;
    private final MongoTemplate mongoTemplate;

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
        m.setPayload(cmd.payload());
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

    @Override
    public List<Message> loadBefore(Long conversationId, long beforeSeq, int limit) {
        // 历史翻页:倒序取 seq<beforeSeq 的最近 limit 条,再反转为升序(显示用)
        List<Message> desc = messageRepository.findByConversationIdAndSeqLessThanOrderBySeqDesc(
                conversationId, beforeSeq, PageRequest.of(0, limit));
        List<Message> asc = new ArrayList<>(desc);
        java.util.Collections.reverse(asc);
        return asc;
    }

    @Override
    public List<Long> searchConversationIds(Long projectId, String keyword, int limit) {
        if (!StringUtils.hasText(keyword)) {
            return List.of();
        }
        // 关键词按字面量匹配(转义正则特殊字符,避免注入/异常);只搜本项目、可见、非内部消息
        Query q = new Query(Criteria.where("projectId").is(projectId)
                .and("content").regex(Pattern.quote(keyword), "i")
                .and("isVisible").ne(false)
                .and("internal").ne(true));
        @SuppressWarnings("unchecked")
        List<Long> ids = (List<Long>) (List<?>) mongoTemplate.findDistinct(q, "conversationId", Message.class, Long.class);
        return ids.size() > limit ? ids.subList(0, limit) : ids;
    }

    @Override
    public List<Long> mentionedConversationIds(Long projectId, Long memberId, int limit) {
        if (memberId == null) {
            return List.of();
        }
        // 内部消息中 mentions 数组含该成员;本项目、未撤回
        Query q = new Query(Criteria.where("projectId").is(projectId)
                .and("internal").is(true)
                .and("mentions").is(memberId)
                .and("isVisible").ne(false));
        @SuppressWarnings("unchecked")
        List<Long> ids = (List<Long>) (List<?>) mongoTemplate.findDistinct(q, "conversationId", Message.class, Long.class);
        return ids.size() > limit ? ids.subList(0, limit) : ids;
    }

    @Override
    public Message retract(Long conversationId, Long msgId, String operatorType, Long operatorId) {
        Message m = messageRepository.findByConversationIdAndMsgId(conversationId, msgId)
                .orElseThrow(() -> new BizException(ResultCode.MESSAGE_NOT_FOUND));
        // 只能撤回本人发送的消息(类型 + 发送者id 双重匹配)
        if (!operatorType.equals(m.getSenderType()) || !Objects.equals(operatorId, m.getSenderId())) {
            throw new BizException(ResultCode.RETRACT_FORBIDDEN);
        }
        // 已撤回:幂等返回(并发重复点击不报错)
        if (Boolean.FALSE.equals(m.getIsVisible())) {
            return m;
        }
        if (System.currentTimeMillis() - m.getTimestamp() > RETRACT_WINDOW_MS) {
            throw new BizException(ResultCode.RETRACT_EXPIRED);
        }
        m.setIsVisible(false);
        return messageRepository.save(m);
    }
}
