package com.aitalky.admin.controller;

import com.aitalky.common.api.R;
import com.aitalky.framework.web.RequiresFunction;
import com.aitalky.platform.dto.LanguageVO;
import com.aitalky.platform.dto.SaveLanguageCmd;
import com.aitalky.platform.service.LanguageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 语种字典管理接口(平台权限 dict)。维护可选语种全集。
 */
@RestController
@RequestMapping("/api/admin/languages")
@RequiredArgsConstructor
public class LanguageAdminController {

    private final LanguageService languageService;

    /** 全部语种(含停用) */
    @RequiresFunction("dict")
    @GetMapping
    public R<List<LanguageVO>> list() {
        return R.ok(languageService.listAll());
    }

    /** 新增/编辑语种 */
    @RequiresFunction("dict")
    @PostMapping
    public R<Long> save(@Valid @RequestBody SaveLanguageCmd cmd) {
        return R.ok(languageService.save(cmd));
    }

    /** 启用/停用 */
    @RequiresFunction("dict")
    @PutMapping("/{id}/status")
    public R<Void> updateStatus(@PathVariable Long id, @RequestParam Integer status) {
        languageService.updateStatus(id, status);
        return R.ok();
    }

    /** 删除 */
    @RequiresFunction("dict")
    @DeleteMapping("/{id}")
    public R<Void> delete(@PathVariable Long id) {
        languageService.delete(id);
        return R.ok();
    }
}
