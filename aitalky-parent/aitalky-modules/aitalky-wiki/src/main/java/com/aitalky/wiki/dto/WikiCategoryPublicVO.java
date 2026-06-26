package com.aitalky.wiki.dto;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 对外站点分类页(对齐参考 img-51):头部 + 分类信息 + 按分组列出的已发布文章卡片。
 * directArticles=直接挂分类(无分组)的文章;groups=各分组及其文章。仅含已发布。
 */
public record WikiCategoryPublicVO(
        WikiSiteHeaderVO header,
        Long id,
        String icon,
        String name,
        String description,
        int articleCount,
        List<ArticleCard> directArticles,
        List<Group> groups
) {
    /** 文章卡片(标题 + 摘要 + 更新时间 + 外链码) */
    public record ArticleCard(String shareCode, String title, String summary, LocalDateTime updateTime) {
    }

    /** 分组(名称 + 其下已发布文章) */
    public record Group(String name, List<ArticleCard> articles) {
    }
}
