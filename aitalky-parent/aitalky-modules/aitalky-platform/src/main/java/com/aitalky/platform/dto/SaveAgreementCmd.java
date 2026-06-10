package com.aitalky.platform.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * 新增/编辑协议命令。id 为空=新增(按 type+language 唯一)。
 */
public record SaveAgreementCmd(
        Long id,
        @NotBlank String type,
        @NotBlank String language,
        String title,
        String content,
        String version,
        Integer status
) {
}
