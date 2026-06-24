package com.aitalky.app.service;

import com.aitalky.billing.service.QuotaService;
import com.aitalky.common.api.ResultCode;
import com.aitalky.common.exception.BizException;
import com.aitalky.conversation.entity.CnvConversation;
import com.aitalky.conversation.service.ConversationService;
import com.aitalky.framework.tenant.TenantContext;
import com.aitalky.framework.translate.TranslateResult;
import com.aitalky.framework.translate.TranslateService;
import com.aitalky.message.document.Message;
import com.aitalky.message.service.MessageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.redisson.api.RedissonClient;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/**
 * 翻译编排(app 层):串起「会话归属校验 → 译文缓存 → 配额校验 → 调引擎 → 存缓存 → 扣字符」。
 * <p>对齐参考系统计费:客户消息译文缓存(translations[lang]),<b>同条同语言再译命中缓存、不再调引擎也不扣费</b>;
 * 按源文本字符数扣 translate_char,已用量累计在 Redis(QuotaService 只给上限,used 由本层维护)。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TranslationService {

    /** 翻译资源类型(对齐 billing 配额/加量包) */
    private static final String RES_TRANSLATE = "translate_char";

    private final TranslateService translateService;     // framework 引擎入口
    private final MessageService messageService;
    private final ConversationService conversationService;
    private final QuotaService quotaService;
    private final RedissonClient redisson;

    /**
     * 翻译某条消息到目标语言,返回译文。命中缓存直接返回(不扣费)。
     * @param targetLang aitalky 标准语言码(zh_CN/en_US...)
     */
    public String translateMessage(Long conversationId, Long msgId, String targetLang) {
        if (!translateService.enabled()) {
            throw new BizException(ResultCode.SYSTEM_ERROR);
        }
        if (!StringUtils.hasText(targetLang)) {
            throw new BizException(ResultCode.PARAM_INVALID);
        }
        Long projectId = TenantContext.getProjectId();
        // 会话归属校验:多租户拦截器保证坐席只能取到本项目会话,取不到即非法
        CnvConversation conv = conversationService.getById(conversationId);

        Message m = messageService.getMessage(conversationId, msgId);
        // 仅文本消息可翻译(图片/文件等富消息 content 是 URL,不翻)
        if (!"text".equals(m.getType())) {
            throw new BizException(ResultCode.PARAM_INVALID);
        }
        // 缓存命中:已有该语言译文 → 直接返回,不调引擎、不扣费
        if (m.getTranslations() != null && m.getTranslations().containsKey(targetLang)) {
            return m.getTranslations().get(targetLang);
        }
        String text = m.getContent();
        if (!StringUtils.hasText(text)) {
            return "";
        }
        // 配额:已用字符(Redis 累计) + 本次预估(源文本长度) ≤ 上限;不够抛 RESOURCE_QUOTA_EXCEEDED
        String usedKey = usedKey(projectId);
        long used = redisson.getAtomicLong(usedKey).get();
        quotaService.ensure(projectId, RES_TRANSLATE, used, text.length());

        TranslateResult r = translateService.translate(text, targetLang);
        messageService.saveTranslation(conversationId, msgId, targetLang, r.translatedText());
        // 按引擎返回的实际字符数扣减已用量
        long remainAfter = redisson.getAtomicLong(usedKey).addAndGet(r.charCount());
        log.info("消息翻译完成 convId={}, msgId={}, target={}, chars={}, projectUsed={}",
                conversationId, msgId, targetLang, r.charCount(), remainAfter);
        return r.translatedText();
    }

    /** 项目已用翻译字符数累计 key */
    private String usedKey(Long projectId) {
        return "translate:used:" + projectId;
    }
}
