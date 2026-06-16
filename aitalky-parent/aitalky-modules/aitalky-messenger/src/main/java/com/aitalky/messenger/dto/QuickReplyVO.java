package com.aitalky.messenger.dto;

import java.time.LocalDateTime;

/**
 * 快捷回复条目。categoryName=分类名(未分类为 null);editorId=最近编辑成员id(updateBy),
 * editorName 由 app 层 Controller 映射成员昵称填充(messenger 模块不依赖 identity)。
 */
public record QuickReplyVO(
        Long id, Long categoryId, String categoryName, String title, String content,
        Integer sort, Long editorId, String editorName, LocalDateTime updateTime) {

    /** Controller 回填最近编辑人昵称(其余字段不变) */
    public QuickReplyVO withEditorName(String name) {
        return new QuickReplyVO(id, categoryId, categoryName, title, content, sort, editorId, name, updateTime);
    }
}
