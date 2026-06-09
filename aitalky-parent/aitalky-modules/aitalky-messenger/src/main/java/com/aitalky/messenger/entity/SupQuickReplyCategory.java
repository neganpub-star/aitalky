package com.aitalky.messenger.entity;

import com.aitalky.framework.mybatis.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/** 快捷回复分类。project_id 多租户自动注入。 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("sup_quick_reply_category")
public class SupQuickReplyCategory extends BaseEntity {

    private Long projectId;
    private String name;
    private Integer sort;
}
