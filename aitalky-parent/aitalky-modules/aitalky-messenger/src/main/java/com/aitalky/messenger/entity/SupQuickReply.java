package com.aitalky.messenger.entity;

import com.aitalky.framework.mybatis.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/** 快捷回复。scope:1项目共享 2个人;category_id 可空(未分类)。project_id 多租户自动注入。 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("sup_quick_reply")
public class SupQuickReply extends BaseEntity {

    private Long projectId;
    private Integer scope;
    private Long ownerMemberId;
    private Long categoryId;
    private Integer sort;
    private String title;
    private String content;
    private String language;
}
