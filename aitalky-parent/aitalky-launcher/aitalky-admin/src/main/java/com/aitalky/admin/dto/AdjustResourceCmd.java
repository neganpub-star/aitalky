package com.aitalky.admin.dto;

import jakarta.validation.constraints.NotNull;

/**
 * 后管调整项目扩展额度(永久加量包:customer/translate_char/ai_tokens)。
 * <p>amount = 该项目已购加量包配额(覆盖设置;总量 = 免费默认 + 本值)。
 *
 * @param resourceType 资源类型:customer / translate_char / ai_tokens
 * @param amount       已购加量包配额(≥0)
 */
public record AdjustResourceCmd(
        @NotNull String resourceType,
        @NotNull Long amount
) {
}
