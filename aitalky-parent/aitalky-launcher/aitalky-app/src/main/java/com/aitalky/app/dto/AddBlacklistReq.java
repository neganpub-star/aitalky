package com.aitalky.app.dto;

/** 手动加入黑名单(targetType 1用户/2游客设备) */
public record AddBlacklistReq(Integer targetType, String targetValue, String reason) {
}
