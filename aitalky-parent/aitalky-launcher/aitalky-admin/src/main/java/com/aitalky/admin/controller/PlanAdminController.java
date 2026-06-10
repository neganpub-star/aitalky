package com.aitalky.admin.controller;

import com.aitalky.common.api.R;
import com.aitalky.framework.web.RequiresFunction;
import com.aitalky.platform.dto.PlanVO;
import com.aitalky.platform.dto.SavePlanCmd;
import com.aitalky.platform.service.PlanService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 套餐管理接口(平台权限 plans)。
 */
@RestController
@RequestMapping("/api/admin/plans")
@RequiredArgsConstructor
public class PlanAdminController {

    private final PlanService planService;

    /** 套餐列表(含配额) */
    @RequiresFunction("plans")
    @GetMapping
    public R<List<PlanVO>> list() {
        return R.ok(planService.list());
    }

    /** 套餐详情 */
    @RequiresFunction("plans")
    @GetMapping("/{id}")
    public R<PlanVO> get(@PathVariable Long id) {
        return R.ok(planService.get(id));
    }

    /** 新增/编辑套餐 */
    @RequiresFunction("plans")
    @PostMapping
    public R<Long> save(@Valid @RequestBody SavePlanCmd cmd) {
        return R.ok(planService.save(cmd));
    }

    /** 上架/下架 */
    @RequiresFunction("plans")
    @PutMapping("/{id}/status")
    public R<Void> updateStatus(@PathVariable Long id, @RequestParam Integer status) {
        planService.updateStatus(id, status);
        return R.ok();
    }

    /** 删除 */
    @RequiresFunction("plans")
    @DeleteMapping("/{id}")
    public R<Void> delete(@PathVariable Long id) {
        planService.delete(id);
        return R.ok();
    }
}
