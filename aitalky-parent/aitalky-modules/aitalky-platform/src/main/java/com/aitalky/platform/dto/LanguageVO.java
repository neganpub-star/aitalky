package com.aitalky.platform.dto;

/**
 * 语种字典项(展示/下发)。
 */
public record LanguageVO(
        Long id,
        String code,
        String zhName,
        String enName,
        Integer sort,
        Integer status
) {
}
