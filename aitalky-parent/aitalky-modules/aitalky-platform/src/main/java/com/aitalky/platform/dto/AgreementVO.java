package com.aitalky.platform.dto;

/**
 * 协议详情。
 */
public record AgreementVO(
        Long id,
        String type,
        String language,
        String title,
        String content,
        String version,
        Integer status
) {
}
