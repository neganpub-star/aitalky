package com.aitalky.messenger.service.impl;

import com.aitalky.framework.tenant.TenantContext;
import com.aitalky.messenger.dto.MessengerConfigVO;
import com.aitalky.messenger.dto.MessengerI18nVO;
import com.aitalky.messenger.dto.MessengerLanguageVO;
import com.aitalky.messenger.dto.MessengerPublicVO;
import com.aitalky.messenger.entity.MseMessenger;
import com.aitalky.messenger.entity.MseMessengerI18n;
import com.aitalky.messenger.entity.MseMessengerLanguage;
import com.aitalky.messenger.mapper.MseMessengerI18nMapper;
import com.aitalky.messenger.mapper.MseMessengerLanguageMapper;
import com.aitalky.messenger.mapper.MseMessengerMapper;
import com.aitalky.messenger.service.MessengerConfigService;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * 信使配置实现。
 * <p>后管读写(getConfig/saveConfig)依赖多租户拦截器:select 自动按当前 project_id 过滤、insert 自动填。
 * <p>init 公开读取(getPublicConfig)无登录上下文(projectId 为 null,拦截器整体忽略),故显式 eq(projectId) 过滤。
 * <p>启用语种以 mse_messenger_language 表为准(对齐参考系统 getAppLanguage),不再用 mse_messenger 的 JSON 字段。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MessengerConfigServiceImpl implements MessengerConfigService {

    private static final String DEFAULT_LANGUAGE = "zh_CN";
    /** 无任何配置时的默认启用语种:简体中文(默认) + 英文 */
    private static final List<MessengerLanguageVO> DEFAULT_LANGUAGES = List.of(
            new MessengerLanguageVO("zh_CN", true), new MessengerLanguageVO("en_US", false));

    private final MseMessengerMapper messengerMapper;
    private final MseMessengerI18nMapper i18nMapper;
    private final MseMessengerLanguageMapper langMapper;

    @Override
    public MessengerConfigVO getConfig() {
        MseMessenger m = messengerMapper.selectOne(Wrappers.<MseMessenger>lambdaQuery().last("limit 1"));
        List<MessengerI18nVO> i18n = i18nMapper.selectList(Wrappers.<MseMessengerI18n>lambdaQuery())
                .stream().map(this::toI18nVO).toList();
        List<MessengerLanguageVO> langs = listLanguages();
        List<String> enabled = langs.stream().map(MessengerLanguageVO::language).toList();
        String defLang = langs.stream().filter(MessengerLanguageVO::isDefault).map(MessengerLanguageVO::language)
                .findFirst().orElse(DEFAULT_LANGUAGE);
        if (m == null) {
            // 无配置:返回默认值,前端可直接编辑保存(brandName/logo 由 controller 注入项目名/LOGO)
            return new MessengerConfigVO(null, null, null, null, null, null,
                    defLang, enabled, null, 0, true, true, true, true, true, true, i18n);
        }
        // brandName/logo 置空,由 controller 从 ProjectService 注入(品牌=项目名称/LOGO,只读)
        return new MessengerConfigVO(
                null, null, m.getCustomDomain(), m.getBadge(),
                m.getWebTitle(), m.getWebIcon(),
                defLang, enabled,
                m.getReplyTime(),
                Optional.ofNullable(m.getMessageRetentionDays()).orElse(0),
                !Boolean.FALSE.equals(m.getPopupEnabled()),
                !Boolean.FALSE.equals(m.getPopupAllowClose()),
                !Boolean.FALSE.equals(m.getSysMsgUnread()),
                !Boolean.FALSE.equals(m.getSysMsgTyping()),
                !Boolean.FALSE.equals(m.getSysMsgMemberRetract()),
                !Boolean.FALSE.equals(m.getCustomerRetractEnabled()),
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
        // 注意:brandName/logo 不在此持久化(品牌=项目名称/LOGO,在项目设置改);启用语种以语种表为准,此处不动
        m.setCustomDomain(vo.customDomain());
        m.setBadge(vo.badge());
        m.setWebTitle(vo.webTitle());
        m.setWebIcon(vo.webIcon());
        m.setReplyTime(vo.replyTime());
        m.setMessageRetentionDays(Math.max(0, vo.messageRetentionDays()));
        m.setPopupEnabled(vo.popupEnabled());
        m.setPopupAllowClose(vo.popupAllowClose());
        m.setSysMsgUnread(vo.sysMsgUnread());
        m.setSysMsgTyping(vo.sysMsgTyping());
        m.setSysMsgMemberRetract(vo.sysMsgMemberRetract());
        m.setCustomerRetractEnabled(vo.customerRetractEnabled());
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
    public List<MessengerLanguageVO> listLanguages() {
        List<MseMessengerLanguage> rows = queryLanguages(null);
        if (rows.isEmpty()) {
            return DEFAULT_LANGUAGES;
        }
        return rows.stream()
                .map(r -> new MessengerLanguageVO(r.getLanguage(), Integer.valueOf(1).equals(r.getType())))
                .toList();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void saveLanguages(List<MessengerLanguageVO> languages) {
        // 规整:去空、去重(保序),并保证恰好一个默认语种
        Map<String, Boolean> desired = new LinkedHashMap<>();
        if (languages != null) {
            for (MessengerLanguageVO l : languages) {
                if (l != null && StringUtils.hasText(l.language())) {
                    desired.putIfAbsent(l.language(), l.isDefault());
                }
            }
        }
        if (desired.isEmpty()) {
            desired.put(DEFAULT_LANGUAGE, true);
        }
        // 默认语种:取第一个标记为默认的;没有则首个语种为默认
        String defaultLang = desired.entrySet().stream().filter(Map.Entry::getValue).map(Map.Entry::getKey)
                .findFirst().orElse(desired.keySet().iterator().next());

        Long projectId = TenantContext.getProjectId();
        Map<String, MseMessengerLanguage> existing = new LinkedHashMap<>();
        for (MseMessengerLanguage e : queryLanguages(null)) {
            existing.put(e.getLanguage(), e);
        }
        // 删除:已存在但不在目标集合(物理删除,避免逻辑删除后重新添加同语种唯一键冲突)
        for (String lang : existing.keySet()) {
            if (!desired.containsKey(lang)) {
                langMapper.physicalDelete(projectId, lang);
            }
        }
        // 新增/更新:写入 type(默认=1)与排序
        int sort = 0;
        for (String lang : desired.keySet()) {
            int type = lang.equals(defaultLang) ? 1 : 0;
            MseMessengerLanguage e = existing.get(lang);
            if (e == null) {
                e = new MseMessengerLanguage();
                e.setLanguage(lang);
                e.setType(type);
                e.setSort(sort);
                langMapper.insert(e); // project_id/审计/id 自动写入
            } else {
                e.setType(type);
                e.setSort(sort);
                langMapper.updateById(e);
            }
            sort++;
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
        String defaultLang = queryLanguages(projectId).stream()
                .filter(r -> Integer.valueOf(1).equals(r.getType())).map(MseMessengerLanguage::getLanguage)
                .findFirst().orElse(DEFAULT_LANGUAGE);
        String useLang = StringUtils.hasText(lang) ? lang : defaultLang;
        MseMessengerI18n i = i18nMapper.selectOne(Wrappers.<MseMessengerI18n>lambdaQuery()
                .eq(MseMessengerI18n::getProjectId, projectId)
                .eq(MseMessengerI18n::getLanguage, useLang).last("limit 1"));
        // 客户语言无内容时回退默认语言
        if (i == null && !defaultLang.equals(useLang)) {
            i = i18nMapper.selectOne(Wrappers.<MseMessengerI18n>lambdaQuery()
                    .eq(MseMessengerI18n::getProjectId, projectId)
                    .eq(MseMessengerI18n::getLanguage, defaultLang).last("limit 1"));
        }
        // brandName/logo 置空,由 PublicMessengerController 注入项目名称/LOGO
        return new MessengerPublicVO(
                null, null, m.getWebTitle(), m.getWebIcon(), m.getReplyTime(),
                i == null ? null : i.getGreeting(),
                i == null ? null : i.getTeamIntro(),
                i == null ? null : i.getUrgentNotice(),
                i != null && Boolean.TRUE.equals(i.getUrgentEnabled()));
    }

    /** 查启用语种(projectId 非空=显式过滤,用于无上下文的 init;为空=靠租户拦截器自动过滤)。默认语种排前 */
    private List<MseMessengerLanguage> queryLanguages(Long projectId) {
        var q = Wrappers.<MseMessengerLanguage>lambdaQuery();
        if (projectId != null) {
            q.eq(MseMessengerLanguage::getProjectId, projectId);
        }
        q.orderByDesc(MseMessengerLanguage::getType)
                .orderByAsc(MseMessengerLanguage::getSort)
                .orderByAsc(MseMessengerLanguage::getId);
        return langMapper.selectList(q);
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
}
