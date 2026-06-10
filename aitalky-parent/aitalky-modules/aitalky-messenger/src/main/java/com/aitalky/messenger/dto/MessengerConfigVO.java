package com.aitalky.messenger.dto;

import java.util.List;

/** 信使配置(坐席台后管读写;对应 mse_messenger + mse_messenger_i18n) */
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
        List<MessengerI18nVO> i18n) {
}
