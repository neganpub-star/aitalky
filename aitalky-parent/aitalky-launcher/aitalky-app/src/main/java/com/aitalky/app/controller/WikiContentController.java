package com.aitalky.app.controller;

import com.aitalky.common.api.R;
import com.aitalky.framework.web.RequiresFunction;
import com.aitalky.wiki.dto.CategoryDetailVO;
import com.aitalky.wiki.dto.CategoryReq;
import com.aitalky.wiki.dto.CategoryVO;
import com.aitalky.wiki.dto.WikiArticleRowVO;
import com.aitalky.wiki.service.WikiContentService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * wiki 内容配置(站点 → 类别/分组/关联文章)。功能码=wiki.app.content(读写同码,对齐 PermissionCatalog)。
 */
@RestController
@RequestMapping("/api/wiki")
@RequiredArgsConstructor
public class WikiContentController {

    private final WikiContentService contentService;

    // ===== 类别 =====
    @GetMapping("/sites/{siteId}/categories")
    @RequiresFunction("wiki.app.content")
    public R<List<CategoryVO>> listCategories(@PathVariable Long siteId, @RequestParam(required = false) String lang) {
        return R.ok(contentService.listCategories(siteId, lang));
    }

    @PostMapping("/sites/{siteId}/categories")
    @RequiresFunction("wiki.app.content")
    public R<Long> createCategory(@PathVariable Long siteId, @RequestBody CategoryReq.SaveCategory req) {
        return R.ok(contentService.createCategory(siteId, req));
    }

    @PutMapping("/categories/{categoryId}")
    @RequiresFunction("wiki.app.content")
    public R<Void> updateCategory(@PathVariable Long categoryId, @RequestBody CategoryReq.SaveCategory req) {
        contentService.updateCategory(categoryId, req);
        return R.ok();
    }

    @DeleteMapping("/categories/{categoryId}")
    @RequiresFunction("wiki.app.content")
    public R<Void> deleteCategory(@PathVariable Long categoryId) {
        contentService.deleteCategory(categoryId);
        return R.ok();
    }

    @PutMapping("/sites/{siteId}/categories/sort")
    @RequiresFunction("wiki.app.content")
    public R<Void> sortCategories(@PathVariable Long siteId, @RequestBody CategoryReq.Sort req) {
        contentService.sortCategories(siteId, req.ids());
        return R.ok();
    }

    @GetMapping("/categories/{categoryId}")
    @RequiresFunction("wiki.app.content")
    public R<CategoryDetailVO> categoryDetail(@PathVariable Long categoryId, @RequestParam(required = false) String lang) {
        return R.ok(contentService.categoryDetail(categoryId, lang));
    }

    // ===== 分组 =====
    @PostMapping("/categories/{categoryId}/groups")
    @RequiresFunction("wiki.app.content")
    public R<Long> createGroup(@PathVariable Long categoryId, @RequestBody CategoryReq.SaveGroup req) {
        return R.ok(contentService.createGroup(categoryId, req));
    }

    @PutMapping("/groups/{groupId}")
    @RequiresFunction("wiki.app.content")
    public R<Void> updateGroup(@PathVariable Long groupId, @RequestBody CategoryReq.SaveGroup req) {
        contentService.updateGroup(groupId, req);
        return R.ok();
    }

    @DeleteMapping("/groups/{groupId}")
    @RequiresFunction("wiki.app.content")
    public R<Void> deleteGroup(@PathVariable Long groupId) {
        contentService.deleteGroup(groupId);
        return R.ok();
    }

    @PutMapping("/categories/{categoryId}/groups/sort")
    @RequiresFunction("wiki.app.content")
    public R<Void> sortGroups(@PathVariable Long categoryId, @RequestBody CategoryReq.Sort req) {
        contentService.sortGroups(categoryId, req.ids());
        return R.ok();
    }

    // ===== 关联文章 =====
    @GetMapping("/categories/{categoryId}/linkable")
    @RequiresFunction("wiki.app.content")
    public R<List<WikiArticleRowVO>> linkable(@PathVariable Long categoryId, @RequestParam(required = false) String lang) {
        return R.ok(contentService.linkableArticles(categoryId, lang));
    }

    @PostMapping("/categories/{categoryId}/link")
    @RequiresFunction("wiki.app.content")
    public R<Void> linkArticles(@PathVariable Long categoryId, @RequestBody CategoryReq.LinkArticles req) {
        contentService.linkArticles(categoryId, req);
        return R.ok();
    }

    @DeleteMapping("/links/{linkId}")
    @RequiresFunction("wiki.app.content")
    public R<Void> unlink(@PathVariable Long linkId) {
        contentService.unlinkArticle(linkId);
        return R.ok();
    }

    @PutMapping("/categories/{categoryId}/articles/sort")
    @RequiresFunction("wiki.app.content")
    public R<Void> sortArticles(@PathVariable Long categoryId, @RequestParam(required = false) Long groupId, @RequestBody CategoryReq.Sort req) {
        contentService.sortArticles(categoryId, groupId, req.ids());
        return R.ok();
    }
}
