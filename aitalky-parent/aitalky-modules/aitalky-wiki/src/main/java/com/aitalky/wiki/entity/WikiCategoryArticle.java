package com.aitalky.wiki.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * wiki 类别(分组)-文章关联。文章可直接挂类别(groupId=0)或挂分组。
 * <p>不含 del_flag:uk(category_id,article_id) 不含逻辑删标志,逻辑删后重加会撞唯一键,故走<b>物理删除</b>,
 * 因此不继承 {@link com.aitalky.framework.mybatis.BaseEntity}。
 */
@Data
@TableName("wiki_category_article")
public class WikiCategoryArticle implements Serializable {

    @TableId(value = "id", type = IdType.INPUT)
    private Long id;

    private Long projectId;

    private Long categoryId;

    /** 分组ID(0=直接挂类别) */
    private Long groupId;

    private Long articleId;

    /** 排序值 */
    private Integer sort;

    @TableField(value = "create_by", fill = FieldFill.INSERT)
    private Long createBy;

    @TableField(value = "create_time", fill = FieldFill.INSERT)
    private LocalDateTime createTime;

    @TableField(value = "update_by", fill = FieldFill.INSERT_UPDATE)
    private Long updateBy;

    @TableField(value = "update_time", fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updateTime;
}
