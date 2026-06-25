package com.aitalky.wiki.dto;

/**
 * wiki 站点相关请求体集合。
 */
public final class SiteReq {

    private SiteReq() {
    }

    /** 创建自定义应用(对齐参考创建页:图标/默认语言/应用名称/子域)。 */
    public record Create(String icon, String defaultLang, String appName, String subdomain) {
    }

    /**
     * 站点配置(状态/图标/默认语言/多语言/子域/自定义域名/favicon)。
     */
    public record SaveConfig(
            Integer enabled,
            String icon,
            String defaultLang,
            Integer multiLang,
            String subdomain,
            String customDomain,
            String favicon
    ) {
    }

    /**
     * 样式配置(按语言):LOGO/产品简称(全局)+ 应用名称/标题/描述(分语言)+ 主题色/布局(全局)。
     */
    public record SaveStyle(
            String lang,
            String logo,
            String brandShort,
            String appName,
            String title,
            String description,
            String themeColor,
            Integer layout
    ) {
    }
}
