package com.aitalky.wiki.service;

import com.aitalky.wiki.dto.ArticleReq;
import com.aitalky.wiki.dto.WikiArticleDetailVO;
import com.aitalky.wiki.dto.WikiArticleHistoryVO;
import com.aitalky.wiki.dto.WikiArticleRowVO;

import java.util.List;

/**
 * wiki 文章管理。多租户:project_id 由拦截器自动注入/过滤。
 * <p>状态机:1未发布 → 2已发布(草稿==发布) → 3有变更(草稿!=发布) → 取消发布回 1。
 */
public interface WikiArticleService {

    /**
     * 文章列表。
     *
     * @param status null/0=全部、1未发布(含从未发布)、2已发布(含有变更)
     * @param lang   列表「文章名」按该语言显示;null 用简体中文
     */
    List<WikiArticleRowVO> list(Integer status, String lang);

    /** 新建空文章(未发布),返回 id;随后进入编辑器。 */
    Long create();

    /** 文章详情(含各语言草稿 + 已发布快照)。 */
    WikiArticleDetailVO detail(Long articleId);

    /** 保存某语言草稿(实时预览/发布前自动调)。 */
    void saveDraft(Long articleId, ArticleReq.SaveDraft req);

    /** 发布:各语言草稿 → 已发布快照;状态置已发布;生成外链码。 */
    void publish(Long articleId);

    /** 取消发布:回未发布,外链失效。 */
    void unpublish(Long articleId);

    /** 设置/取消推荐。 */
    void toggleRecommend(Long articleId, Integer recommend);

    /** 历史记录列表(倒序)。 */
    List<WikiArticleHistoryVO> historyList(Long articleId);

    /** 历史版本快照内容(JSON 文本)。 */
    String historySnapshot(Long historyId);

    /** 删除文章(连带 i18n / 历史 / 关联)。 */
    void delete(Long articleId);
}
