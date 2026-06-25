package com.aitalky.wiki.entity;

import com.aitalky.framework.mybatis.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * wiki 文章。多语言内容(草稿 + 已发布快照)按语言存 {@link WikiArticleI18n}。
 * <p>status:草稿与已发布是否一致——1未发布(从未发布)、2已发布(草稿=已发布)、3有变更(草稿≠已发布)。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("wiki_article")
public class WikiArticle extends BaseEntity {

    private Long projectId;

    /** 发布状态 1未发布 2已发布 3有变更 */
    private Integer status;

    /** 是否推荐 0否 1是(信使端可见) */
    private Integer isRecommend;

    /** 外链分享码(已发布生成) */
    private String shareCode;
}
