package com.aitalky.wiki.dto;

/**
 * wiki 文章相关请求体。
 */
public final class ArticleReq {

    private ArticleReq() {
    }

    /** 保存草稿(按语言)。点击实时预览/发布会自动先保存。 */
    public record SaveDraft(String lang, String title, String summary, String content) {
    }
}
