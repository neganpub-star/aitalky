package com.aitalky.admin.controller;

import com.aitalky.common.api.R;
import com.aitalky.framework.tenant.TenantContext;
import com.aitalky.platform.dto.AdminProfileVO;
import com.aitalky.platform.service.PfAdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 当前登录管理员资料。
 * <p>需带平台级令牌(AuthInterceptor 已校验);adminId 取自上下文(JWT subject)。
 */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminProfileController {

    private final PfAdminService pfAdminService;

    /** 当前管理员资料(用户名/姓名/角色/权限) */
    @GetMapping("/me")
    public R<AdminProfileVO> me() {
        return R.ok(pfAdminService.profile(TenantContext.getAccountId()));
    }
}
