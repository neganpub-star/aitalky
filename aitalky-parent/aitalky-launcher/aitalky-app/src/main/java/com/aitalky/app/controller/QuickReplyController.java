package com.aitalky.app.controller;

import com.aitalky.app.dto.SaveCategoryReq;
import com.aitalky.app.dto.SaveQuickReplyReq;
import com.aitalky.common.api.R;
import com.aitalky.messenger.dto.QuickReplyCategoryVO;
import com.aitalky.messenger.dto.QuickReplyVO;
import com.aitalky.messenger.service.QuickReplyService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 快捷回复(会话服务 → 快捷回复)。项目内共享,任意成员可用/管理。
 * <p>坐席聊天区工具栏列出并插入;设置页管理分类与条目。
 */
@RestController
@RequestMapping("/api/quick-replies")
@RequiredArgsConstructor
public class QuickReplyController {

    private final QuickReplyService quickReplyService;

    @GetMapping("/categories")
    public R<List<QuickReplyCategoryVO>> categories() {
        return R.ok(quickReplyService.listCategories());
    }

    @PostMapping("/categories")
    public R<Long> addCategory(@RequestBody SaveCategoryReq req) {
        return R.ok(quickReplyService.addCategory(req.name()));
    }

    @DeleteMapping("/categories/{id}")
    public R<Void> deleteCategory(@PathVariable Long id) {
        quickReplyService.deleteCategory(id);
        return R.ok();
    }

    @GetMapping
    public R<List<QuickReplyVO>> list() {
        return R.ok(quickReplyService.list());
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

    @DeleteMapping("/{id}")
    public R<Void> delete(@PathVariable Long id) {
        quickReplyService.deleteReply(id);
        return R.ok();
    }
}
