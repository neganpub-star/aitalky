package com.aitalky.app.dto;

/**
 * 会话翻译设置入参(各字段 null=不改)。
 * @param autoTranslate      A 客户消息自动翻译开关 1开/0关
 * @param translateTo        A 客户消息翻译目标语言(zh_CN/en_US...)
 * @param agentAutoTranslate B 坐席消息自动翻译开关 1开/0关
 */
public record TranslateSettingReq(Integer autoTranslate, String translateTo, Integer agentAutoTranslate) {
}
