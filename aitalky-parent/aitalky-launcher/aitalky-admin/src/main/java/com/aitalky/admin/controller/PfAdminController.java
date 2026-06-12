package com.aitalky.admin.controller;

import com.aitalky.common.api.PageResult;
import com.aitalky.common.api.R;
import com.aitalky.framework.tenant.TenantContext;
import com.aitalky.framework.web.RequiresFunction;
import com.aitalky.platform.dto.AdminQuery;
import com.aitalky.platform.dto.AdminVO;
import com.aitalky.platform.dto.ResetAdminPasswordCmd;
import com.aitalky.platform.dto.SaveAdminCmd;
import com.aitalky.platform.service.PfAdminManageService;
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

/**
 * 平台管理员账号管理接口(平台权限 admins)。
 * <p>不可禁用/删除当前登录账号(自我保护);密码经 RSA 传输,后端解密+BCrypt 入库。
 */
@RestController
@RequestMapping("/api/admin/admins")
@RequiredArgsConstructor
public class PfAdminController {

    private final PfAdminManageService adminManageService;

    /** 管理员分页(关键词=用户名/姓名) */
    @RequiresFunction("admins")
    @GetMapping
    public R<PageResult<AdminVO>> page(AdminQuery query) {
        return R.ok(adminManageService.pageAdmins(query));
    }

    /** 新增/编辑管理员 */
    @RequiresFunction("admins")
    @PostMapping
    public R<Long> save(@Valid @RequestBody SaveAdminCmd cmd) {
        return R.ok(adminManageService.saveAdmin(cmd));
    }

    /** 启用/禁用(不可操作自己) */
    @RequiresFunction("admins")
    @PutMapping("/{id}/status")
    public R<Void> updateStatus(@PathVariable Long id, @RequestParam Integer status) {
        adminManageService.updateStatus(id, status, TenantContext.getAccountId());
        return R.ok();
    }

    /** 重置密码 */
    @RequiresFunction("admins")
    @PutMapping("/{id}/password")
    public R<Void> resetPassword(@PathVariable Long id, @Valid @RequestBody ResetAdminPasswordCmd cmd) {
        adminManageService.resetPassword(id, cmd.password());
        return R.ok();
    }

    /** 删除(不可删除自己) */
    @RequiresFunction("admins")
    @DeleteMapping("/{id}")
    public R<Void> delete(@PathVariable Long id) {
        adminManageService.deleteAdmin(id, TenantContext.getAccountId());
        return R.ok();
    }
}
