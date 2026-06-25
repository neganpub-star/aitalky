package com.aitalky.wiki.entity;

import com.aitalky.framework.mybatis.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/** wiki 文章历史记录:创建/编辑/发布/取消发布,snapshot 存各语言内容快照供版本预览。 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("wiki_article_history")
public class WikiArticleHistory extends BaseEntity {

    private Long projectId;

    private Long articleId;

    /** 行为 1创建 2编辑 3发布 4取消发布 */
    private Integer action;

    /** 内容快照(JSON,各语言 title/summary/content) */
    private String snapshot;

    /** 操作人成员ID */
    private Long operatorId;
}
