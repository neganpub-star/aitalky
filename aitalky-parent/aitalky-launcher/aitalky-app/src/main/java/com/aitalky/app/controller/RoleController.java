package com.aitalky.app.controller;

import com.aitalky.common.api.R;
import com.aitalky.framework.log.Log;
import com.aitalky.framework.web.RequiresFunction;
import com.aitalky.identity.domain.PermissionView;
import com.aitalky.identity.dto.PermModule;
import com.aitalky.identity.dto.RoleNameCmd;
import com.aitalky.identity.dto.RolePermCmd;
import com.aitalky.identity.dto.RoleVO;
import com.aitalky.identity.service.RoleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 角色接口。列表供"调整角色"下拉用(项目成员可读);
 * 权限树 CRUD 需「role.manage」功能权限,系统预置角色只读。
 */
@RestController
@RequestMapping("/api/roles")
@RequiredArgsConstructor
public class RoleController {

    private final RoleService roleService;

    /** 角色列表(调整角色下拉 / 角色管理左栏) */
    @GetMapping
    public R<List<RoleVO>> list() {
        return R.ok(roleService.list());
    }

    /** 权限目录(模块/页面/功能) */
    @GetMapping("/catalog")
    @RequiresFunction("role.manage")
    public R<List<PermModule>> catalog() {
        return R.ok(roleService.catalog());
    }

    /** 某角色已勾选权限 */
    @GetMapping("/{id}/permissions")
    @RequiresFunction("role.manage")
    public R<PermissionView> permissions(@PathVariable Long id) {
        return R.ok(roleService.permissions(id));
    }

    /** 新建自定义角色 */
    @PostMapping
    @RequiresFunction("role.manage")
    @Log("新建角色")
    public R<RoleVO> create(@Valid @RequestBody RoleNameCmd cmd) {
        return R.ok(roleService.create(cmd.name()));
    }

    /** 重命名自定义角色 */
    @PutMapping("/{id}/name")
    @RequiresFunction("role.manage")
    @Log("重命名角色")
    public R<Void> rename(@PathVariable Long id, @Valid @RequestBody RoleNameCmd cmd) {
        roleService.rename(id, cmd.name());
        return R.ok();
    }

    /** 保存角色权限 */
    @PutMapping("/{id}/permissions")
    @RequiresFunction("role.manage")
    @Log("保存角色权限")
    public R<Void> updatePermissions(@PathVariable Long id, @RequestBody RolePermCmd cmd) {
        roleService.updatePermissions(id, cmd.pages(), cmd.functions());
        return R.ok();
    }

    /** 删除自定义角色 */
    @DeleteMapping("/{id}")
    @RequiresFunction("role.manage")
    @Log("删除角色")
    public R<Void> delete(@PathVariable Long id) {
        roleService.delete(id);
        return R.ok();
    }
}
