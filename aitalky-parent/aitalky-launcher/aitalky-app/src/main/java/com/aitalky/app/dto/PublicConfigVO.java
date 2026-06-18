package com.aitalky.app.dto;

/**
 * 坐席端可读的平台公共参数。
 *
 * @param contactTelegram      客服 Telegram 链接(空=不展示)
 * @param freeTrialDays        免费体验天数
 * @param defaultTranslateChar 未订阅时概览展示的默认翻译包额度(字符)
 * @param defaultAiTokens      未订阅时概览展示的默认 AI Tokens 额度
 * @param defaultCustomer      未订阅时概览展示的默认客户配额
 */
public record PublicConfigVO(
        String contactTelegram,
        int freeTrialDays,
        long defaultTranslateChar,
        long defaultAiTokens,
        long defaultCustomer
) {
}
