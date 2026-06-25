package com.aitalky.wiki.entity;

import com.aitalky.framework.mybatis.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/** wiki 类别(属于站点)。类别名按语言存 {@link WikiCategoryI18n}。 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("wiki_category")
public class WikiCategory extends BaseEntity {

    private Long projectId;

    /** 所属站点ID */
    private Long siteId;

    /** 类别图标(图标库key) */
    private String icon;

    /** 排序值 */
    private Integer sort;
}
