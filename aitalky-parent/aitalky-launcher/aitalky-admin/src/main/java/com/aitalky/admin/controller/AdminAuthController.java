package com.aitalky.admin.controller;

import com.aitalky.common.api.R;
import com.aitalky.framework.captcha.CaptchaService;
import com.aitalky.framework.ratelimit.RateLimit;
import com.aitalky.framework.security.RsaCryptoService;
import com.aitalky.platform.dto.AdminLoginCmd;
import com.aitalky.platform.dto.AdminLoginResult;
import com.aitalky.platform.service.PfAdminService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 平台后管鉴权接口(公共,WebMvcConfig 已放行)。
 * <p>流程:取公钥 → 取图形验证码 → 用户名+RSA密码+验证码登录 → 拿平台级令牌。
 */
@RestController
@RequestMapping("/api/admin/auth")
@RequiredArgsConstructor
public class AdminAuthController {

    private final PfAdminService pfAdminService;
    private final RsaCryptoService rsaCryptoService;
    private final CaptchaService captchaService;

    /** 下发 RSA 公钥(前端用它加密密码) */
    @GetMapping("/public-key")
    public R<String> publicKey() {
        return R.ok(rsaCryptoService.getPublicKey());
    }

    /** 下发图形验证码(captchaId + base64 图片);限流:每 IP 每分钟最多 30 次 */
    @RateLimit(key = "admin:captcha", count = 30, period = 60)
    @GetMapping("/captcha")
    public R<CaptchaService.Captcha> captcha() {
        return R.ok(captchaService.generate());
    }

    /** 登录 → 平台级令牌;限流:每 IP 每分钟最多 10 次,防暴力破解 */
    @RateLimit(key = "admin:login", count = 10, period = 60)
    @PostMapping("/login")
    public R<AdminLoginResult> login(@Valid @RequestBody AdminLoginCmd cmd) {
        return R.ok(pfAdminService.login(cmd));
    }
}
