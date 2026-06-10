package com.aitalky.messenger.dto;

/** 信使多语言内容(问候语/团队介绍/紧急通知,按语言) */
public record MessengerI18nVO(
        String language,
        String greeting,
        String teamIntro,
        String urgentNotice,
        boolean urgentEnabled) {
}
