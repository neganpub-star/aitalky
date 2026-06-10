package com.aitalky.messenger.service.impl;

import com.aitalky.common.api.ResultCode;
import com.aitalky.common.exception.BizException;
import com.aitalky.messenger.dto.MessengerConfigVO;
import com.aitalky.messenger.dto.MessengerI18nVO;
import com.aitalky.messenger.dto.MessengerPublicVO;
import com.aitalky.messenger.entity.MseMessenger;
import com.aitalky.messenger.entity.MseMessengerI18n;
import com.aitalky.messenger.mapper.MseMessengerI18nMapper;
import com.aitalky.messenger.mapper.MseMessengerMapper;
import com.aitalky.messenger.service.MessengerConfigService;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Optional;

/**
 * 信使配置实现。
 * <p>后管读写(getConfig/saveConfig)依赖多租户拦截器:select 自动按当前 project_id 过滤、insert 自动填。
 * <p>init 公开读取(getPublicConfig)无登录上下文(projectId 为 null,拦截器整体忽略),故显式 eq(projectId) 过滤。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MessengerConfigServiceImpl implements MessengerConfigService {

    private static final List<String> DEFAULT_LANGUAGES = List.of("zh_CN", "en_US");
    private static final String DEFAULT_LANGUAGE = "zh_CN";

    private final MseMessengerMapper messengerMapper;
    private final MseMessengerI18nMapper i18nMapper;
    private final ObjectMapper objectMapper;

    @Override
    public MessengerConfigVO getConfig() {
        MseMessenger m = messengerMapper.selectOne(Wrappers.<MseMessenger>lambdaQuery().last("limit 1"));
        List<MessengerI18nVO> i18n = i18nMapper.selectList(Wrappers.<MseMessengerI18n>lambdaQuery())
                .stream().map(this::toI18nVO).toList();
        if (m == null) {
            // 无配置:返回默认值,前端可直接编辑保存
            return new MessengerConfigVO(null, null, null, null, null, null,
                    DEFAULT_LANGUAGE, DEFAULT_LANGUAGES, null, 0, true, true, i18n);
        }
        return new MessengerConfigVO(
                m.getBrandName(), m.getLogo(), m.getCustomDomain(), m.getBadge(),
                m.getWebTitle(), m.getWebIcon(),
                Optional.ofNullable(m.getDefaultLanguage()).orElse(DEFAULT_LANGUAGE),
                parseLanguages(m.getEnabledLanguages()),
                m.getReplyTime(),
                Optional.ofNullable(m.getMessageRetentionDays()).orElse(0),
                !Boolean.FALSE.equals(m.getPopupEnabled()),
                !Boolean.FALSE.equals(m.getPopupAllowClose()),
                i18n);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void saveConfig(MessengerConfigVO vo) {
        MseMessenger m = messengerMapper.selectOne(Wrappers.<MseMessenger>lambdaQuery().last("limit 1"));
        boolean isNew = m == null;
        if (isNew) {
            m = new MseMessenger();
        }
        m.setBrandName(vo.brandName());
        m.setLogo(vo.logo());
        m.setCustomDomain(vo.customDomain());
        m.setBadge(vo.badge());
        m.setWebTitle(vo.webTitle());
        m.setWebIcon(vo.webIcon());
        m.setDefaultLanguage(Optional.ofNullable(vo.defaultLanguage()).orElse(DEFAULT_LANGUAGE));
        m.setEnabledLanguages(writeLanguages(
                vo.enabledLanguages() == null || vo.enabledLanguages().isEmpty() ? DEFAULT_LANGUAGES : vo.enabledLanguages()));
        m.setReplyTime(vo.replyTime());
        m.setMessageRetentionDays(Math.max(0, vo.messageRetentionDays()));
        m.setPopupEnabled(vo.popupEnabled());
        m.setPopupAllowClose(vo.popupAllowClose());
        if (isNew) {
            messengerMapper.insert(m); // project_id / 审计 / id 由拦截器与填充器自动写入
        } else {
            messengerMapper.updateById(m);
        }
        // 多语言内容:逐条 upsert(uk_project_lang,不能删后重插,否则唯一键冲突)
        if (vo.i18n() != null) {
            for (MessengerI18nVO item : vo.i18n()) {
                if (item == null || !StringUtils.hasText(item.language())) {
                    continue;
                }
                upsertI18n(item);
            }
        }
    }

    @Override
    public MessengerPublicVO getPublicConfig(Long projectId, String lang) {
        if (projectId == null) {
            return null;
        }
        MseMessenger m = messengerMapper.selectOne(Wrappers.<MseMessenger>lambdaQuery()
                .eq(MseMessenger::getProjectId, projectId).last("limit 1"));
        if (m == null) {
            return null;
        }
        String useLang = StringUtils.hasText(lang) ? lang
                : Optional.ofNullable(m.getDefaultLanguage()).orElse(DEFAULT_LANGUAGE);
        MseMessengerI18n i = i18nMapper.selectOne(Wrappers.<MseMessengerI18n>lambdaQuery()
                .eq(MseMessengerI18n::getProjectId, projectId)
                .eq(MseMessengerI18n::getLanguage, useLang).last("limit 1"));
        // 客户语言无内容时回退默认语言
        if (i == null && StringUtils.hasText(m.getDefaultLanguage()) && !m.getDefaultLanguage().equals(useLang)) {
            i = i18nMapper.selectOne(Wrappers.<MseMessengerI18n>lambdaQuery()
                    .eq(MseMessengerI18n::getProjectId, projectId)
                    .eq(MseMessengerI18n::getLanguage, m.getDefaultLanguage()).last("limit 1"));
        }
        return new MessengerPublicVO(
                m.getBrandName(), m.getLogo(), m.getWebTitle(), m.getWebIcon(), m.getReplyTime(),
                i == null ? null : i.getGreeting(),
                i == null ? null : i.getTeamIntro(),
                i == null ? null : i.getUrgentNotice(),
                i != null && Boolean.TRUE.equals(i.getUrgentEnabled()));
    }

    /** 单条多语言内容 upsert(按当前租户 + language) */
    private void upsertI18n(MessengerI18nVO item) {
        MseMessengerI18n existing = i18nMapper.selectOne(Wrappers.<MseMessengerI18n>lambdaQuery()
                .eq(MseMessengerI18n::getLanguage, item.language()).last("limit 1"));
        if (existing == null) {
            MseMessengerI18n e = new MseMessengerI18n();
            e.setLanguage(item.language());
            e.setGreeting(item.greeting());
            e.setTeamIntro(item.teamIntro());
            e.setUrgentNotice(item.urgentNotice());
            e.setUrgentEnabled(item.urgentEnabled());
            i18nMapper.insert(e);
        } else {
            existing.setGreeting(item.greeting());
            existing.setTeamIntro(item.teamIntro());
            existing.setUrgentNotice(item.urgentNotice());
            existing.setUrgentEnabled(item.urgentEnabled());
            i18nMapper.updateById(existing);
        }
    }

    private MessengerI18nVO toI18nVO(MseMessengerI18n e) {
        return new MessengerI18nVO(e.getLanguage(), e.getGreeting(), e.getTeamIntro(),
                e.getUrgentNotice(), Boolean.TRUE.equals(e.getUrgentEnabled()));
    }

    /** 启用语种 JSON → List;解析失败回退默认值(配置脏数据不应让页面打不开) */
    private List<String> parseLanguages(String json) {
        if (!StringUtils.hasText(json)) {
            return DEFAULT_LANGUAGES;
        }
        try {
            List<String> list = objectMapper.readValue(json, new TypeReference<List<String>>() {});
            return list == null || list.isEmpty() ? DEFAULT_LANGUAGES : list;
        } catch (Exception e) {
            log.warn("信使启用语种 JSON 解析失败,回退默认值, raw: {}", json);
            return DEFAULT_LANGUAGES;
        }
    }

    private String writeLanguages(List<String> list) {
        try {
            return objectMapper.writeValueAsString(list);
        } catch (Exception e) {
            log.error("信使启用语种序列化失败", e);
            throw new BizException(ResultCode.SYSTEM_ERROR);
        }
    }
}
