package com.aitalky.admin.controller;

import com.aitalky.common.api.PageResult;
import com.aitalky.common.api.R;
import com.aitalky.framework.web.RequiresFunction;
import com.aitalky.identity.dto.AdminProjectDetailVO;
import com.aitalky.identity.dto.AdminProjectQuery;
import com.aitalky.identity.dto.AdminProjectVO;
import com.aitalky.identity.service.AdminViewService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 项目(租户)管理接口(平台权限 tenants)。跨租户:可见全平台项目。
 */
@RestController
@RequestMapping("/api/admin/projects")
@RequiredArgsConstructor
public class ProjectAdminController {

    private final AdminViewService adminViewService;

    /** 项目分页(关键词=名称/appId,可按状态/站点筛选) */
    @RequiresFunction("tenants")
    @GetMapping
    public R<PageResult<AdminProjectVO>> page(AdminProjectQuery query) {
        return R.ok(adminViewService.pageProjects(query));
    }

    /** 项目详情 */
    @RequiresFunction("tenants")
    @GetMapping("/{id}")
    public R<AdminProjectDetailVO> detail(@PathVariable Long id) {
        return R.ok(adminViewService.projectDetail(id));
    }

    /** 启用/停用项目 */
    @RequiresFunction("tenants")
    @PutMapping("/{id}/status")
    public R<Void> updateStatus(@PathVariable Long id, @RequestParam Integer status) {
        adminViewService.setProjectStatus(id, status);
        return R.ok();
    }
}
