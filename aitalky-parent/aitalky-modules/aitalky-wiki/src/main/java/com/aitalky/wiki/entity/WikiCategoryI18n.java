package com.aitalky.wiki.entity;

import com.aitalky.framework.mybatis.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/** wiki 类别多语言名。 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("wiki_category_i18n")
public class WikiCategoryI18n extends BaseEntity {

    private Long projectId;

    private Long categoryId;

    /** 语言 */
    private String lang;

    /** 类别名(分语言) */
    private String name;
}
