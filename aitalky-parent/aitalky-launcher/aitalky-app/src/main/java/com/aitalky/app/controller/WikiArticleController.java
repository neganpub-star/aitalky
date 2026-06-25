package com.aitalky.app.controller;

import com.aitalky.common.api.R;
import com.aitalky.framework.web.RequiresFunction;
import com.aitalky.identity.dto.MemberBrief;
import com.aitalky.identity.service.MemberService;
import com.aitalky.wiki.dto.ArticleReq;
import com.aitalky.wiki.dto.WikiArticleDetailVO;
import com.aitalky.wiki.dto.WikiArticleHistoryVO;
import com.aitalky.wiki.dto.WikiArticleRowVO;
import com.aitalky.wiki.service.WikiArticleService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * wiki 文章管理(知识库 → 文章)。功能码对齐 PermissionCatalog:
 * 读=任一 wiki.article.*;新增=wiki.article.create;编辑=wiki.article.edit;
 * 发布/取消=wiki.article.publish;删除=wiki.article.delete;推荐=wiki.article.setting。
 * <p>最近编辑人/操作人昵称头像在此层按 memberId 回填(wiki 模块只存 updateBy/operatorId)。
 */
@RestController
@RequestMapping("/api/wiki/articles")
@RequiredArgsConstructor
public class WikiArticleController {

    private final WikiArticleService articleService;
    private final MemberService memberService;

    @GetMapping
    @RequiresFunction({"wiki.article.create", "wiki.article.edit", "wiki.article.publish", "wiki.article.delete", "wiki.article.setting"})
    public R<List<WikiArticleRowVO>> list(@RequestParam(required = false) Integer status,
                                          @RequestParam(required = false) String lang) {
        List<WikiArticleRowVO> rows = articleService.list(status, lang);
        Map<Long, MemberBrief> cache = new HashMap<>();
        return R.ok(rows.stream().map(r -> {
            if (r.editorId() == null) {
                return r;
            }
            MemberBrief b = cache.computeIfAbsent(r.editorId(), memberService::brief);
            return b == null ? r : r.withEditor(b.nickname(), b.avatar());
        }).toList());
    }

    @GetMapping("/{id}")
    @RequiresFunction({"wiki.article.create", "wiki.article.edit", "wiki.article.publish", "wiki.article.delete", "wiki.article.setting"})
    public R<WikiArticleDetailVO> detail(@PathVariable Long id) {
        WikiArticleDetailVO d = articleService.detail(id);
        if (d.editorId() != null) {
            MemberBrief b = memberService.brief(d.editorId());
            if (b != null) {
                d = d.withEditor(b.nickname(), b.avatar());
            }
        }
        return R.ok(d);
    }

    /**
     * 收件箱发送文章用:列出已发布文章(供坐席选择发给客户)。
     * 不挂 @RequiresFunction——发文章是会话场景能力,坐席不一定有 wiki 管理权;仅需登录态(拦截器保证)。
     */
    @GetMapping("/sendable")
    public R<List<WikiArticleRowVO>> sendable(@RequestParam(required = false) String lang) {
        return R.ok(articleService.list(2, lang)); // status=2:已发布(含有变更)
    }

    /** 收件箱发送文章用:取已发布文章详情(预览/取快照)。同样仅需登录态。 */
    @GetMapping("/sendable/{id}")
    public R<WikiArticleDetailVO> sendableDetail(@PathVariable Long id) {
        WikiArticleDetailVO d = articleService.detail(id);
        if (d.editorId() != null) {
            MemberBrief b = memberService.brief(d.editorId());
            if (b != null) {
                d = d.withEditor(b.nickname(), b.avatar());
            }
        }
        return R.ok(d);
    }

    @PostMapping
    @RequiresFunction("wiki.article.create")
    public R<Long> create() {
        return R.ok(articleService.create());
    }

    @PutMapping("/{id}/draft")
    @RequiresFunction("wiki.article.edit")
    public R<Void> saveDraft(@PathVariable Long id, @RequestBody ArticleReq.SaveDraft req) {
        articleService.saveDraft(id, req);
        return R.ok();
    }

    @PutMapping("/{id}/publish")
    @RequiresFunction("wiki.article.publish")
    public R<Void> publish(@PathVariable Long id) {
        articleService.publish(id);
        return R.ok();
    }

    @PutMapping("/{id}/unpublish")
    @RequiresFunction("wiki.article.publish")
    public R<Void> unpublish(@PathVariable Long id) {
        articleService.unpublish(id);
        return R.ok();
    }

    @PutMapping("/{id}/recommend")
    @RequiresFunction("wiki.article.setting")
    public R<Void> recommend(@PathVariable Long id, @RequestBody Map<String, Integer> body) {
        articleService.toggleRecommend(id, body.get("recommend"));
        return R.ok();
    }

    @GetMapping("/{id}/history")
    @RequiresFunction({"wiki.article.create", "wiki.article.edit", "wiki.article.publish", "wiki.article.delete", "wiki.article.setting"})
    public R<List<WikiArticleHistoryVO>> history(@PathVariable Long id) {
        List<WikiArticleHistoryVO> rows = articleService.historyList(id);
        Map<Long, MemberBrief> cache = new HashMap<>();
        return R.ok(rows.stream().map(h -> {
            if (h.operatorId() == null) {
                return h;
            }
            MemberBrief b = cache.computeIfAbsent(h.operatorId(), memberService::brief);
            return b == null ? h : h.withOperator(b.nickname(), b.avatar());
        }).toList());
    }

    @GetMapping("/history/{historyId}/snapshot")
    @RequiresFunction({"wiki.article.create", "wiki.article.edit", "wiki.article.publish", "wiki.article.delete", "wiki.article.setting"})
    public R<String> historySnapshot(@PathVariable Long historyId) {
        return R.ok(articleService.historySnapshot(historyId));
    }

    @DeleteMapping("/{id}")
    @RequiresFunction("wiki.article.delete")
    public R<Void> delete(@PathVariable Long id) {
        articleService.delete(id);
        return R.ok();
    }
}
