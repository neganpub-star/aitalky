package com.aitalky.wiki.entity;

import com.aitalky.framework.mybatis.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/** wiki 分组(类别下)。分组名按语言存 {@link WikiGroupI18n}。 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("wiki_group")
public class WikiGroup extends BaseEntity {

    private Long projectId;

    /** 所属类别ID */
    private Long categoryId;

    /** 排序值 */
    private Integer sort;
}
