package com.aitalky.admin.controller;

import com.aitalky.billing.service.OrderAdminService;
import com.aitalky.billing.service.dto.AdminOrderQuery;
import com.aitalky.billing.service.dto.AdminOrderVO;
import com.aitalky.common.api.PageResult;
import com.aitalky.common.api.R;
import com.aitalky.framework.web.RequiresFunction;
import com.aitalky.identity.entity.IdProject;
import com.aitalky.identity.service.ProjectService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 订单管理接口(平台后管,权限 orders)。跨项目订单列表,按创建时间倒序;关联补项目名。
 */
@RestController
@RequestMapping("/api/admin/orders")
@RequiredArgsConstructor
public class OrderAdminController {

    private final OrderAdminService orderAdminService;
    private final ProjectService projectService;

    /** 订单列表(分页,倒序;可选 projectId/status/type 过滤) */
    @RequiresFunction("orders")
    @GetMapping
    public R<PageResult<AdminOrderVO>> page(@RequestParam(required = false) Long projectId,
                                            @RequestParam(required = false) Integer status,
                                            @RequestParam(required = false) String type,
                                            @RequestParam(defaultValue = "1") Long page,
                                            @RequestParam(defaultValue = "10") Long size) {
        PageResult<AdminOrderVO> result = orderAdminService.page(
                new AdminOrderQuery(projectId, status, type, page, size));
        // 批量补项目名(去重查询,避免 N+1 内重复)
        Map<Long, String> nameCache = new HashMap<>();
        List<AdminOrderVO> records = result.records().stream().map(o -> {
            String name = nameCache.computeIfAbsent(o.projectId(), pid -> {
                IdProject p = projectService.getById(pid);
                return p == null ? null : p.getName();
            });
            return o.withProjectName(name);
        }).toList();
        return R.ok(PageResult.of(records, result.total(), result.current(), result.size()));
    }
}
