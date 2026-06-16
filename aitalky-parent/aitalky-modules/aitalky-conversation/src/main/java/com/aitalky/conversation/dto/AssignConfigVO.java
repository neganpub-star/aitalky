package com.aitalky.conversation.dto;

/**
 * 会话分配配置。assignMode:0手动 1轮流 2负载;maxConcurrent:每坐席最大同时进行中会话数,0=不限。
 * autoCloseIdleMinutes:会话保持期(分钟),空闲超过该时长自动结束,0=不自动(对应前端"保持期开关"关)。
 */
public record AssignConfigVO(Integer assignMode, Integer maxConcurrent, Integer autoCloseIdleMinutes) {
}
