package com.aitalky.app.service;

import com.aitalky.app.controller.PublicMessengerController;
import com.aitalky.billing.service.QuotaService;
import com.aitalky.common.api.ResultCode;
import com.aitalky.common.event.MsgPushEvent;
import com.aitalky.common.exception.BizException;
import com.aitalky.conversation.entity.CnvConversation;
import com.aitalky.conversation.service.ConversationService;
import com.aitalky.framework.tenant.TenantContext;
import com.aitalky.framework.translate.TranslateResult;
import com.aitalky.framework.translate.TranslateService;
import com.aitalky.message.document.Message;
import com.aitalky.message.event.MessagePushPublisher;
import com.aitalky.message.service.MessageService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * 翻译编排(app 层):双向翻译。
 * <ul>
 *   <li><b>A 客户消息方向</b>:翻成坐席看的语言(会话 translate_to)。手动单条({@link #translateMessage})
 *       或自动({@link #autoTranslateCustomerMsgAsync},异步翻完 WS 推坐席)。译文缓存命中不扣费。</li>
 *   <li><b>B 坐席消息方向</b>:翻成客户语言({@link #translateAgentText}),发送时调用,发给客户的是译文。
 *       坐席消息每次翻译都扣费(对齐参考)。</li>
 * </ul>
 * 计费:按源文本字符数扣 translate_char;已用量累计在 Redis(QuotaService 只给上限)。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TranslationService {

    private static final String RES_TRANSLATE = "translate_char";

    private final TranslateService translateService;
    private final MessageService messageService;
    private final ConversationService conversationService;
    private final QuotaService quotaService;
    private final MessagePushPublisher pushPublisher;
    private final ObjectMapper objectMapper;

    /** A 自动翻译用守护线程池:不阻塞客户发送,翻完异步推坐席 */
    private final ExecutorService pool = Executors.newFixedThreadPool(3, r -> {
        Thread t = new Thread(r, "msg-translate");
        t.setDaemon(true);
        return t;
    });

    public boolean enabled() {
        return translateService.enabled();
    }

    /**
     * A 手动:翻译某条消息到 targetLang,返回译文。命中缓存直接返回(不扣费)。
     */
    public String translateMessage(Long conversationId, Long msgId, String targetLang) {
        if (!translateService.enabled() || !StringUtils.hasText(targetLang)) {
            throw new BizException(ResultCode.PARAM_INVALID);
        }
        conversationService.getById(conversationId);   // 租户隔离校验
        Message m = messageService.getMessage(conversationId, msgId);
        if (!"text".equals(m.getType())) {
            throw new BizException(ResultCode.PARAM_INVALID);
        }
        if (m.getTranslations() != null && m.getTranslations().containsKey(targetLang)) {
            return m.getTranslations().get(targetLang);   // 缓存命中,不扣费
        }
        if (!StringUtils.hasText(m.getContent())) {
            return "";
        }
        TranslateResult r = doTranslate(TenantContext.getProjectId(), m.getContent(), targetLang);
        messageService.saveTranslation(conversationId, msgId, targetLang, r.translatedText());
        return r.translatedText();
    }

    /**
     * A 自动:异步翻译客户消息到会话 translate_to,翻完存缓存并 WS 推坐席(同 seq 带 translations,前端覆盖更新)。
     * 会话未开自动翻译/无目标语言/非文本 直接跳过。不阻塞客户发送。
     */
    public void autoTranslateCustomerMsgAsync(CnvConversation conv, Long msgId, String type, String content) {
        if (!translateService.enabled()
                || conv.getAutoTranslate() == null || conv.getAutoTranslate() != 1
                || !StringUtils.hasText(conv.getTranslateTo())
                || !"text".equals(type) || !StringUtils.hasText(content)) {
            return;
        }
        String targetLang = conv.getTranslateTo();
        pool.execute(() -> {
            try {
                TranslateResult r = doTranslate(conv.getProjectId(), content, targetLang);
                Message updated = messageService.saveTranslation(conv.getId(), msgId, targetLang, r.translatedText());
                // 推坐席(assignee + 项目频道);customerId=null 不回推客户(客户不看自己消息的译文)
                String payload = objectMapper.writeValueAsString(PublicMessengerController.toVO(updated));
                pushPublisher.publish(new MsgPushEvent(conv.getId(), conv.getProjectId(),
                        conv.getAssigneeMemberId(), null, payload));
            } catch (Exception e) {
                log.warn("客户消息自动翻译失败 convId={}, msgId={}, 原因={}", conv.getId(), msgId, e.getMessage());
            }
        });
    }

    /**
     * B 坐席消息:翻成客户语言 targetLang,返回译文(发送时调用)。每次都扣费。
     * <p>未启用/空文本/无目标语言 返回 null(调用方按原文正常发)。
     * <b>配额不足或引擎失败则抛异常</b>——调用方据此<b>阻止发送</b>并提示坐席(避免把看不懂的原文发给客户)。
     */
    public String translateAgentText(Long projectId, String text, String targetLang) {
        if (!translateService.enabled() || !StringUtils.hasText(text) || !StringUtils.hasText(targetLang)) {
            return null;
        }
        return doTranslate(projectId, text, targetLang).translatedText(); // 配额不足→TRANSLATE_QUOTA_EXCEEDED;引擎错→SYSTEM_ERROR
    }

    /** 配额校验 + 调引擎 + 按实际字符扣减;已用量持久化 DB(QuotaService)。配额不足抛 TRANSLATE_QUOTA_EXCEEDED */
    private TranslateResult doTranslate(Long projectId, String text, String targetLang) {
        long used = quotaService.used(projectId, RES_TRANSLATE);
        if (!quotaService.hasRemaining(projectId, RES_TRANSLATE, used, text.length())) {
            throw new BizException(ResultCode.TRANSLATE_QUOTA_EXCEEDED);   // 翻译额度不足:提示充值/关翻译
        }
        TranslateResult r = translateService.translate(text, targetLang);
        quotaService.addUsed(projectId, RES_TRANSLATE, r.charCount());     // 按实际字符落 DB
        log.info("翻译扣费 projectId={}, target={}, chars={}", projectId, targetLang, r.charCount());
        return r;
    }
}
