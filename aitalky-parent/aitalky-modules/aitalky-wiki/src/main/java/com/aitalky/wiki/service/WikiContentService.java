package com.aitalky.wiki.service;

import com.aitalky.wiki.dto.CategoryDetailVO;
import com.aitalky.wiki.dto.CategoryReq;
import com.aitalky.wiki.dto.CategoryVO;
import com.aitalky.wiki.dto.WikiArticleRowVO;

import java.util.List;

/**
 * wiki 内容配置:站点下的类别 / 分组 / 关联文章。多租户:project_id 自动注入/过滤。
 * <p>排序铁律(对齐参考):某语言下文章/分组改排序,自动适用于所有语言(排序存在结构表 sort 字段,与语言无关)。
 */
public interface WikiContentService {

    /** 站点下类别列表(name/description 取 lang 语言)。 */
    List<CategoryVO> listCategories(Long siteId, String lang);

    /** 新增类别,返回 id。 */
    Long createCategory(Long siteId, CategoryReq.SaveCategory req);

    /** 编辑类别。 */
    void updateCategory(Long categoryId, CategoryReq.SaveCategory req);

    /** 删除类别(连带分组 + 关联,均物理删关联)。 */
    void deleteCategory(Long categoryId);

    /** 类别排序(站点内)。 */
    void sortCategories(Long siteId, List<Long> orderedIds);

    /** 类别详情(分组 + 关联文章,文案取 lang)。 */
    CategoryDetailVO categoryDetail(Long categoryId, String lang);

    /** 新增分组,返回 id。 */
    Long createGroup(Long categoryId, CategoryReq.SaveGroup req);

    /** 编辑分组。 */
    void updateGroup(Long groupId, CategoryReq.SaveGroup req);

    /** 删除分组(其下文章关联改挂回类别,不删文章)。 */
    void deleteGroup(Long groupId);

    /** 分组排序(类别内)。 */
    void sortGroups(Long categoryId, List<Long> orderedIds);

    /** 关联已有文章到 类别/分组(去重)。 */
    void linkArticles(Long categoryId, CategoryReq.LinkArticles req);

    /** 解除关联(删 join 行,不删文章)。 */
    void unlinkArticle(Long linkId);

    /** 关联文章排序(同一 类别+分组 内)。 */
    void sortArticles(Long categoryId, Long groupId, List<Long> orderedLinkIds);

    /** 可关联文章候选(已发布优先;排除已关联到本类别的)。 */
    List<WikiArticleRowVO> linkableArticles(Long categoryId, String lang);
}
