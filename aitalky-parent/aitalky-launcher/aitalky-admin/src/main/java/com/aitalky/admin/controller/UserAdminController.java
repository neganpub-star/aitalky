package com.aitalky.admin.controller;

import com.aitalky.common.api.PageResult;
import com.aitalky.common.api.R;
import com.aitalky.framework.web.RequiresFunction;
import com.aitalky.identity.dto.AdminAccountDetailVO;
import com.aitalky.identity.dto.AdminAccountQuery;
import com.aitalky.identity.dto.AdminAccountVO;
import com.aitalky.identity.service.AdminViewService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 用户(账号)管理接口(平台权限 users)。跨租户:可见全平台注册用户。
 */
@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
public class UserAdminController {

    private final AdminViewService adminViewService;

    /** 用户分页(关键词=邮箱/用户名,可按状态筛选) */
    @RequiresFunction("users")
    @GetMapping
    public R<PageResult<AdminAccountVO>> page(AdminAccountQuery query) {
        return R.ok(adminViewService.pageAccounts(query));
    }

    /** 用户详情(含其加入的项目) */
    @RequiresFunction("users")
    @GetMapping("/{id}")
    public R<AdminAccountDetailVO> detail(@PathVariable Long id) {
        return R.ok(adminViewService.accountDetail(id));
    }

    /** 启用/禁用账号 */
    @RequiresFunction("users")
    @PutMapping("/{id}/status")
    public R<Void> updateStatus(@PathVariable Long id, @RequestParam Integer status) {
        adminViewService.setAccountStatus(id, status);
        return R.ok();
    }
}
