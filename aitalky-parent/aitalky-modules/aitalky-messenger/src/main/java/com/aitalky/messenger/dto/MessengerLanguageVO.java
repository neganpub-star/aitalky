package com.aitalky.messenger.dto;

/** 信使启用语种(常规设置页读写) */
public record MessengerLanguageVO(
        String language,
        boolean isDefault) {
}
