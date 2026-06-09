package com.aitalky.app.controller;

import com.aitalky.common.api.R;
import com.aitalky.identity.dto.EnterResult;
import com.aitalky.identity.dto.LoginCmd;
import com.aitalky.identity.dto.LoginResult;
import com.aitalky.identity.dto.RegisterCmd;
import com.aitalky.identity.dto.SendCodeCmd;
import com.aitalky.identity.service.AccountService;
import com.aitalky.identity.service.ProjectService;
import com.aitalky.framework.tenant.TenantContext;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 鉴权接口。
 * <p>register/login 为公共接口(WebMvcConfig 已放行);enter 需带「账号级」令牌。
 * <p>流程: 注册 → 登录(拿账号级 token + 项目列表) → 进入某项目(换项目级 token) → 访问租户接口。
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AccountService accountService;
    private final ProjectService projectService;

    /** 发送邮箱验证码(scene: REGISTER/LOGIN/RESET_PWD) */
    @PostMapping("/send-code")
    public R<Void> sendCode(@Valid @RequestBody SendCodeCmd cmd) {
        accountService.sendCode(cmd.scene(), cmd.email());
        return R.ok();
    }

    /** 注册(需邮箱验证码) */
    @PostMapping("/register")
    public R<Long> register(@Valid @RequestBody RegisterCmd cmd) {
        return R.ok(accountService.register(cmd));
    }

    /** 登录 → 账号级令牌 + 可进入项目列表 */
    @PostMapping("/login")
    public R<LoginResult> login(@Valid @RequestBody LoginCmd cmd) {
        return R.ok(accountService.login(cmd));
    }

    /** 进入项目 → 项目级令牌(后续租户接口用它) */
    @PostMapping("/enter/{projectId}")
    public R<EnterResult> enter(@PathVariable Long projectId) {
        return R.ok(projectService.enter(TenantContext.getAccountId(), projectId));
    }
}
