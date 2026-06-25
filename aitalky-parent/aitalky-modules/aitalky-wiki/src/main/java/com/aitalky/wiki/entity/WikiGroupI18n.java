package com.aitalky.wiki.entity;

import com.aitalky.framework.mybatis.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/** wiki 分组多语言名。 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("wiki_group_i18n")
public class WikiGroupI18n extends BaseEntity {

    private Long projectId;

    private Long groupId;

    /** 语言 */
    private String lang;

    /** 分组名(分语言) */
    private String name;
}
