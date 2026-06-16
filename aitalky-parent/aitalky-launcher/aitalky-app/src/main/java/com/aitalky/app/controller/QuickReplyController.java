package com.aitalky.app.controller;

import com.aitalky.app.dto.SaveCategoryReq;
import com.aitalky.app.dto.SaveQuickReplyReq;
import com.aitalky.common.api.R;
import com.aitalky.identity.dto.MemberBrief;
import com.aitalky.identity.service.MemberService;
import com.aitalky.messenger.dto.QuickReplyCategoryVO;
import com.aitalky.messenger.dto.QuickReplyVO;
import com.aitalky.messenger.service.QuickReplyService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 快捷回复(会话服务 → 快捷回复)。项目内共享,任意成员可用/管理。
 * <p>坐席聊天区工具栏列出并插入;设置页管理分类与条目。
 * <p>列表「最近编辑人」昵称在此层映射(quickReply 服务只存 updateBy 成员id,不依赖 identity)。
 */
@RestController
@RequestMapping("/api/quick-replies")
@RequiredArgsConstructor
public class QuickReplyController {

    private final QuickReplyService quickReplyService;
    private final MemberService memberService;

    @GetMapping("/categories")
    public R<List<QuickReplyCategoryVO>> categories() {
        return R.ok(quickReplyService.listCategories());
    }

    @PostMapping("/categories")
    public R<Long> addCategory(@RequestBody SaveCategoryReq req) {
        return R.ok(quickReplyService.addCategory(req.name()));
    }

    /** 重命名分类 */
    @PutMapping("/categories/{id}")
    public R<Void> renameCategory(@PathVariable Long id, @RequestBody SaveCategoryReq req) {
        quickReplyService.renameCategory(id, req.name());
        return R.ok();
    }

    @DeleteMapping("/categories/{id}")
    public R<Void> deleteCategory(@PathVariable Long id) {
        quickReplyService.deleteCategory(id);
        return R.ok();
    }

    @GetMapping
    public R<List<QuickReplyVO>> list() {
        List<QuickReplyVO> list = quickReplyService.list();
        // 回填最近编辑人昵称:按 editorId 去重查成员(数量少,缓存避免重复查)
        Map<Long, String> nameCache = new HashMap<>();
        List<QuickReplyVO> enriched = list.stream().map(v -> {
            if (v.editorId() == null) {
                return v;
            }
            String name = nameCache.computeIfAbsent(v.editorId(), mid -> {
                MemberBrief b = memberService.brief(mid);
                return b == null ? null : b.nickname();
            });
            return v.withEditorName(name);
        }).toList();
        return R.ok(enriched);
    }

    @PostMapping
    public R<Long> add(@RequestBody SaveQuickReplyReq req) {
        return R.ok(quickReplyService.addReply(req.categoryId(), req.title(), req.content()));
    }

    @PutMapping("/{id}")
    public R<Void> update(@PathVariable Long id, @RequestBody SaveQuickReplyReq req) {
        quickReplyService.updateReply(id, req.categoryId(), req.title(), req.content());
        return R.ok();
    }

    /** 更新排序值(列表排序列内联编辑) */
    @PutMapping("/{id}/sort")
    public R<Void> updateSort(@PathVariable Long id, @RequestBody SortReq req) {
        quickReplyService.updateSort(id, req.sort());
        return R.ok();
    }

    @DeleteMapping("/{id}")
    public R<Void> delete(@PathVariable Long id) {
        quickReplyService.deleteReply(id);
        return R.ok();
    }

    public record SortReq(Integer sort) {
    }
}
