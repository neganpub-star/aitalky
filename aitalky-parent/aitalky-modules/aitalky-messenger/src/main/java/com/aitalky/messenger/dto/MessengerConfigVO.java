package com.aitalky.messenger.dto;

import java.util.List;

/**
 * 信使配置(坐席台后管读写;对应 mse_messenger + mse_messenger_i18n)。
 * <p>brandName/logo 为项目名称/LOGO(只读展示):由 controller 从 ProjectService 注入,save 时忽略(品牌在项目设置改)。
 */
public record MessengerConfigVO(
        String brandName,
        String logo,
        String customDomain,
        String badge,
        String webTitle,
        String webIcon,
        String defaultLanguage,
        List<String> enabledLanguages,
        String replyTime,
        int messageRetentionDays,
        boolean popupEnabled,
        boolean popupAllowClose,
        boolean sysMsgUnread,
        boolean sysMsgTyping,
        boolean sysMsgMemberRetract,
        boolean customerRetractEnabled,
        List<MessengerI18nVO> i18n) {
}
