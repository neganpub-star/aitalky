package com.aitalky.wiki.entity;

import com.aitalky.framework.mybatis.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * wiki 文章多语言内容。每篇文章每种语言一行,同时存草稿(title/summary/content)与已发布快照(pub_*)。
 * <p>"有变更"= 任一已发布语言的 pub_* 与草稿不一致。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("wiki_article_i18n")
public class WikiArticleI18n extends BaseEntity {

    private Long projectId;

    private Long articleId;

    /** 语言 */
    private String lang;

    /** 文章名(草稿) */
    private String title;

    /** 文章描述(草稿) */
    private String summary;

    /** 文章正文(草稿) */
    private String content;

    /** 文章名(已发布快照) */
    private String pubTitle;

    /** 文章描述(已发布快照) */
    private String pubSummary;

    /** 文章正文(已发布快照) */
    private String pubContent;

    /** 该语言是否已发布 0否 1是 */
    private Integer published;
}
