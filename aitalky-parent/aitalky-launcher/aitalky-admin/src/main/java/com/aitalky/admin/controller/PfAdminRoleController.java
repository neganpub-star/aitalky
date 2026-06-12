package com.aitalky.admin.controller;

import com.aitalky.common.api.R;
import com.aitalky.framework.web.RequiresFunction;
import com.aitalky.platform.dto.FunctionDefVO;
import com.aitalky.platform.dto.RoleVO;
import com.aitalky.platform.dto.SaveRoleCmd;
import com.aitalky.platform.service.PfAdminRoleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 平台角色管理接口(平台权限 roles)。角色 CRUD + 给角色分配功能码(=分配菜单)。
 */
@RestController
@RequestMapping("/api/admin/roles")
@RequiredArgsConstructor
public class PfAdminRoleController {

    private final PfAdminRoleService roleService;

    /** 可分配功能码全集(角色勾选项) */
    @RequiresFunction("roles")
    @GetMapping("/functions")
    public R<List<FunctionDefVO>> functions() {
        return R.ok(roleService.listFunctions());
    }

    /** 角色列表 */
    @RequiresFunction("roles")
    @GetMapping
    public R<List<RoleVO>> list() {
        return R.ok(roleService.listRoles());
    }

    /** 新增/编辑角色 */
    @RequiresFunction("roles")
    @PostMapping
    public R<Long> save(@Valid @RequestBody SaveRoleCmd cmd) {
        return R.ok(roleService.saveRole(cmd));
    }

    /** 删除角色 */
    @RequiresFunction("roles")
    @DeleteMapping("/{id}")
    public R<Void> delete(@PathVariable Long id) {
        roleService.deleteRole(id);
        return R.ok();
    }
}
