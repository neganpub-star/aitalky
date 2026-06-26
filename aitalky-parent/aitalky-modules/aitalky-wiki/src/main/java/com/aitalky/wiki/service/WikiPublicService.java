package com.aitalky.wiki.service;

import com.aitalky.wiki.dto.WikiCategoryPublicVO;
import com.aitalky.wiki.dto.WikiSitePublicVO;

import java.util.List;

/**
 * 对外站点(E)只读装配:免登录、跳过租户过滤,按站点 shareCode 定位。
 * 只暴露已开启站点 + 已发布文章。
 */
public interface WikiPublicService {

    /** 站点首页:头部 + 各分类区块(前若干篇已发布文章 + 总数)。 */
    WikiSitePublicVO site(String shareCode, String lang);

    /** 分类页:头部 + 分类信息 + 按分组列出的已发布文章。 */
    WikiCategoryPublicVO category(String shareCode, Long categoryId, String lang);

    /** 站内搜索:标题/摘要命中的已发布文章卡片。 */
    List<WikiCategoryPublicVO.ArticleCard> search(String shareCode, String keyword, String lang);
}
