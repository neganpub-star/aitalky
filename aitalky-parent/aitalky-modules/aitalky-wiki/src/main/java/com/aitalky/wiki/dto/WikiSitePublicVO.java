package com.aitalky.wiki.dto;

import java.util.List;

/**
 * 对外站点首页(对齐参考 img-50):头部 + 各分类区块(图标/名称/描述/前若干篇已发布文章 + 总数)。
 * 只含已发布文章;分类按内容配置排序。
 */
public record WikiSitePublicVO(
        WikiSiteHeaderVO header,
        List<Category> categories
) {
    /**
     * 分类区块。
     *
     * @param articleCount 该分类已发布文章总数(用于"共N篇,查看更多")
     * @param topArticles  首页展示的前若干篇(标题 + 外链码)
     */
    public record Category(
            Long id,
            String icon,
            String name,
            String description,
            int articleCount,
            List<Article> topArticles
    ) {
    }

    /** 文章条目(首页:仅标题 + shareCode 跳阅读页) */
    public record Article(String shareCode, String title) {
    }
}
