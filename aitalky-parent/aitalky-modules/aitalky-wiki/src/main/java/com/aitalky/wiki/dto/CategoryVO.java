package com.aitalky.wiki.dto;

import java.util.List;

/**
 * wiki 类别行(内容配置列表;name/description 按所选语言取)。
 *
 * @param articleCount 已关联文章数(未发布+已发布,不区分语言)
 */
public record CategoryVO(
        Long id,
        String icon,
        String name,
        String description,
        Integer sort,
        Integer articleCount,
        List<CategoryReq.I18nText> i18ns
) {
}
