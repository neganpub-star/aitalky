package com.aitalky.wiki.dto;

import java.time.LocalDateTime;

/**
 * wiki 文章列表行(对齐参考 img-04:文章ID/文章名/发布状态/文章语言数/是否推荐/最近编辑/外链)。
 *
 * @param status     发布状态 1未发布 2已发布 3有变更
 * @param langCount  已设置内容的语言数
 * @param editorName 最近编辑人昵称(app 层回填)
 */
public record WikiArticleRowVO(
        Long id,
        String title,
        Integer status,
        Integer langCount,
        Integer isRecommend,
        Long editorId,
        String editorName,
        String editorAvatar,
        LocalDateTime updateTime,
        String shareCode
) {
    /** 回填最近编辑人(昵称+头像) */
    public WikiArticleRowVO withEditor(String name, String avatar) {
        return new WikiArticleRowVO(id, title, status, langCount, isRecommend, editorId, name, avatar, updateTime, shareCode);
    }
}
