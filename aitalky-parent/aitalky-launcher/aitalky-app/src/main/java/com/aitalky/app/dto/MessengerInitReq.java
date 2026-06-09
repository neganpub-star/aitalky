package com.aitalky.app.dto;

import jakarta.validation.constraints.NotBlank;

/** 信使端初始化请求(URL 接入参数) */
public record MessengerInitReq(
        @NotBlank String appId,
        String groupId,
        String userId,
        String visitorId,
        String lang,
        String source) {
}
