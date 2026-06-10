package com.aitalky.platform.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * 新增/编辑语种命令。id 为空=新增(按 code 唯一)。
 */
public record SaveLanguageCmd(
        Long id,
        @NotBlank String code,
        @NotBlank String zhName,
        @NotBlank String enName,
        Integer sort,
        Integer status
) {
}
