package com.aitalky.app.controller;

import com.aitalky.common.api.R;
import com.aitalky.framework.tenant.TenantContext;
import com.aitalky.identity.dto.CreateProjectCmd;
import com.aitalky.identity.dto.ProjectBrief;
import com.aitalky.identity.service.ProjectService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 项目接口。创建项目用「账号级」令牌即可(此时尚无项目);
 * 创建后会自动建好 3 系统角色并把当前账号设为 owner 成员。
 */
@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;

    /** 创建项目(当前登录账号成为 owner) */
    @PostMapping
    public R<ProjectBrief> create(@Valid @RequestBody CreateProjectCmd cmd) {
        return R.ok(projectService.create(TenantContext.getAccountId(), cmd));
    }
}
