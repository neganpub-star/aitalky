package com.aitalky.admin.controller;

import com.aitalky.common.api.R;
import com.aitalky.framework.web.RequiresFunction;
import com.aitalky.platform.dto.AddonVO;
import com.aitalky.platform.dto.SaveAddonCmd;
import com.aitalky.platform.service.AddonService;
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
 * 加量包管理接口(平台权限 addons)。
 */
@RestController
@RequestMapping("/api/admin/addons")
@RequiredArgsConstructor
public class AddonAdminController {

    private final AddonService addonService;

    @RequiresFunction("addons")
    @GetMapping
    public R<List<AddonVO>> list() {
        return R.ok(addonService.list());
    }

    @RequiresFunction("addons")
    @PostMapping
    public R<Long> save(@Valid @RequestBody SaveAddonCmd cmd) {
        return R.ok(addonService.save(cmd));
    }

    @RequiresFunction("addons")
    @PutMapping("/{id}/status")
    public R<Void> updateStatus(@PathVariable Long id, @RequestParam Integer status) {
        addonService.updateStatus(id, status);
        return R.ok();
    }

    @RequiresFunction("addons")
    @DeleteMapping("/{id}")
    public R<Void> delete(@PathVariable Long id) {
        addonService.delete(id);
        return R.ok();
    }
}
