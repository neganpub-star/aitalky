package com.aitalky.wiki.dto;

/**
 * wiki 站点列表行(对齐参考:图标/应用名称/描述/状态/分享)。
 *
 * @param name        默认语言下的应用名称
 * @param description 默认语言下的自定义描述文字
 * @param enabled     站点状态 0已禁用 1已开启
 * @param isDefault   是否默认应用(1不可删)
 */
public record WikiSiteVO(
        Long id,
        String icon,
        String name,
        String description,
        String defaultLang,
        Integer multiLang,
        String subdomain,
        Integer enabled,
        Integer isDefault
) {
}
