package com.aitalky.wiki.dto;

import java.util.List;

/**
 * wiki 站点详情(编辑页):站点全局配置 + 各语言文案。
 */
public record WikiSiteDetailVO(
        Long id,
        String shareCode,
        String icon,
        String logo,
        String brandShort,
        String defaultLang,
        Integer multiLang,
        String themeColor,
        Integer layout,
        String subdomain,
        String customDomain,
        String favicon,
        Integer enabled,
        Integer isDefault,
        List<I18n> i18ns
) {
    /** 单语言文案 */
    public record I18n(String lang, String appName, String title, String description) {
    }
}
