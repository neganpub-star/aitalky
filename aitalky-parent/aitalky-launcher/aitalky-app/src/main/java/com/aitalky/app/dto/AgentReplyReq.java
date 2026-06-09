package com.aitalky.app.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.List;

/** 坐席回复 */
public record AgentReplyReq(
        @NotBlank String content,
        String type,
        Boolean internal,
        List<Long> mentions) {
}
