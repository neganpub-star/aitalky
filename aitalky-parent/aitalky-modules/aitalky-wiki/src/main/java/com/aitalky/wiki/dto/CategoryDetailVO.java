package com.aitalky.wiki.dto;

import java.util.List;

/**
 * wiki 类别详情(对齐参考 img_15):类别头部信息 + 直接挂类别的文章 + 各分组(含其文章)。
 * 文案均按所选语言取。
 */
public record CategoryDetailVO(
        Long id,
        String icon,
        String name,
        String description,
        List<LinkedArticle> directArticles,
        List<Group> groups
) {
    /** 关联文章行(status:1未发布 2已发布 3有变更;title 取所选语言,空回退默认语言)。 */
    public record LinkedArticle(Long linkId, Long articleId, String title, Integer status, Integer sort) {
    }

    /** 分组(含其下文章)。 */
    public record Group(Long id, String name, Integer sort, List<LinkedArticle> articles) {
    }
}
