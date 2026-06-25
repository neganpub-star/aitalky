package com.aitalky.wiki.dto;

import java.time.LocalDateTime;
import java.util.List;

/**
 * wiki 文章详情(含各语言草稿 + 已发布快照,供详情页与编辑器复用)。
 */
public record WikiArticleDetailVO(
        Long id,
        Integer status,
        Integer isRecommend,
        String shareCode,
        Long editorId,
        String editorName,
        String editorAvatar,
        LocalDateTime updateTime,
        List<I18n> i18ns
) {
    /**
     * 单语言内容。draft=草稿(编辑用);pub=已发布快照(详情已发布视图用)。
     */
    public record I18n(
            String lang,
            String title, String summary, String content,
            String pubTitle, String pubSummary, String pubContent,
            Integer published
    ) {
    }

    public WikiArticleDetailVO withEditor(String name, String avatar) {
        return new WikiArticleDetailVO(id, status, isRecommend, shareCode, editorId, name, avatar, updateTime, i18ns);
    }
}
