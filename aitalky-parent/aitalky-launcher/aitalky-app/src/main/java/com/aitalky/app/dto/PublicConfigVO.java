package com.aitalky.app.dto;

/**
 * 坐席端可读的平台公共参数。
 *
 * @param contactTelegram 客服 Telegram 链接(空=不展示)
 * @param freeTrialDays   免费体验天数
 */
public record PublicConfigVO(String contactTelegram, int freeTrialDays) {
}
