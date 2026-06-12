package com.aitalky.app.controller;

import com.aitalky.common.api.R;
import com.aitalky.framework.log.Log;
import com.aitalky.framework.tenant.TenantContext;
import com.aitalky.framework.web.RequiresFunction;
import com.aitalky.identity.dto.CreateProjectCmd;
import com.aitalky.identity.dto.DeactivateProjectCmd;
import com.aitalky.identity.dto.ProjectBrief;
import com.aitalky.identity.dto.ProjectDetailVO;
import com.aitalky.identity.dto.TransferOwnerCmd;
import com.aitalky.identity.dto.UpdateProjectCmd;
import com.aitalky.identity.service.ProjectService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 项目接口。创建项目用「账号级」令牌即可(此时尚无项目);
 * 基本信息查看需 project.setting;改名/换Logo/转让/注销在 Service 层强校验「仅负责人」。
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

    /** 当前项目基本信息 */
    @GetMapping("/current")
    @RequiresFunction("project.setting")
    public R<ProjectDetailVO> current() {
        return R.ok(projectService.currentDetail());
    }

    /** 更新基本信息(改名/换 Logo;仅负责人) */
    @PutMapping("/current")
    @RequiresFunction("project.setting")
    @Log("更新项目基本信息")
    public R<Void> update(@Valid @RequestBody UpdateProjectCmd cmd) {
        projectService.update(cmd);
        return R.ok();
    }

    /** 负责人转让(仅负责人;二次校验) */
    @PostMapping("/current/transfer")
    @RequiresFunction("project.setting")
    @Log("负责人转让")
    public R<Void> transfer(@Valid @RequestBody TransferOwnerCmd cmd) {
        projectService.transferOwner(cmd);
        return R.ok();
    }

    /** 注销项目(仅负责人;二次校验) */
    @PostMapping("/current/deactivate")
    @RequiresFunction("project.setting")
    @Log("注销项目")
    public R<Void> deactivate(@Valid @RequestBody DeactivateProjectCmd cmd) {
        projectService.deactivate(cmd);
        return R.ok();
    }
}
