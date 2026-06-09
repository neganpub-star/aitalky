package com.aitalky.app.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/** 客户发送消息 */
public record CustomerSendReq(
        @NotNull Long conversationId,
        @NotBlank String content,
        String type) {
}
