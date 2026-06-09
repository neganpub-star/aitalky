package com.aitalky.app.controller;

import com.aitalky.common.api.R;
import com.aitalky.identity.dto.RoleVO;
import com.aitalky.identity.service.RoleService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** 角色接口(列表供调整角色下拉/角色管理用,项目成员可读) */
@RestController
@RequestMapping("/api/roles")
@RequiredArgsConstructor
public class RoleController {

    private final RoleService roleService;

    @GetMapping
    public R<List<RoleVO>> list() {
        return R.ok(roleService.list());
    }
}
