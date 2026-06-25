package com.aitalky.wiki.dto;

import java.time.LocalDateTime;

/**
 * wiki 文章历史记录行。action:1创建 2编辑 3发布 4取消发布。
 */
public record WikiArticleHistoryVO(
        Long id,
        Integer action,
        Long operatorId,
        String operatorName,
        String operatorAvatar,
        LocalDateTime createTime
) {
    public WikiArticleHistoryVO withOperator(String name, String avatar) {
        return new WikiArticleHistoryVO(id, action, operatorId, name, avatar, createTime);
    }
}
