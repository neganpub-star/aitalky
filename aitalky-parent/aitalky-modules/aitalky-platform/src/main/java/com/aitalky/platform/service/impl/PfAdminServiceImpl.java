package com.aitalky.platform.service.impl;

import com.aitalky.common.api.ResultCode;
import com.aitalky.common.exception.BizException;
import com.aitalky.framework.captcha.CaptchaService;
import com.aitalky.framework.security.JwtUtil;
import com.aitalky.framework.security.RsaCryptoService;
import com.aitalky.platform.dto.AdminLoginCmd;
import com.aitalky.platform.dto.AdminLoginResult;
import com.aitalky.platform.dto.AdminProfileVO;
import com.aitalky.platform.entity.PfAdmin;
import com.aitalky.platform.entity.PfAdminRole;
import com.aitalky.platform.mapper.PfAdminMapper;
import com.aitalky.platform.mapper.PfAdminRoleMapper;
import com.aitalky.platform.service.PfAdminService;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 平台管理员服务实现。
 * <p>登录链路:图形验证码 → 用户名查管理员 → RSA 解密比对密码 → 加载平台权限 → 签发 scope=platform 的 JWT。
 * <p>令牌 functions claim 放平台权限码,后续接口沿用 {@code @RequiresFunction} 校验;
 * projectId 不进 claim → 后管上下文 projectId=null → 多租户 SQL 拦截器整表忽略,可跨租户查询。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PfAdminServiceImpl implements PfAdminService {

    private final PfAdminMapper adminMapper;
    private final PfAdminRoleMapper roleMapper;
    private final CaptchaService captchaService;
    private final RsaCryptoService rsaCryptoService;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final ObjectMapper objectMapper;

    @Override
    public AdminLoginResult login(AdminLoginCmd cmd) {
        // 1) 图形验证码(防暴力破解)
        if (!captchaService.verify(cmd.captchaId(), cmd.captchaCode())) {
            throw new BizException(ResultCode.CAPTCHA_ERROR);
        }
        // 2) 用户名查管理员;账号不存在 / 密码错误 统一 LOGIN_FAILED,不暴露用户名是否存在
        PfAdmin admin = adminMapper.selectOne(
                Wrappers.<PfAdmin>lambdaQuery().eq(PfAdmin::getUsername, cmd.username()));
        String rawPassword = rsaCryptoService.decrypt(cmd.password());
        if (admin == null || !passwordEncoder.matches(rawPassword, admin.getPasswordHash())) {
            throw new BizException(ResultCode.LOGIN_FAILED);
        }
        if (admin.getStatus() == null || admin.getStatus() != 1) {
            throw new BizException(ResultCode.ACCOUNT_DISABLED);
        }
        // 3) 加载平台角色权限
        PfAdminRole role = admin.getRoleId() == null ? null : roleMapper.selectById(admin.getRoleId());
        List<String> permissions = parsePermissions(role);
        // 4) 签发平台级令牌:scope=platform + functions=平台权限(不含 projectId)
        Map<String, Object> claims = new HashMap<>();
        claims.put("scope", "platform");
        claims.put("roleId", admin.getRoleId());
        claims.put("functions", permissions);
        String token = jwtUtil.issue(String.valueOf(admin.getId()), claims);
        log.info("平台管理员登录成功 adminId={}", admin.getId());
        return new AdminLoginResult(token, admin.getId(), admin.getUsername(), admin.getRealName(),
                role == null ? null : role.getName(), permissions);
    }

    @Override
    public AdminProfileVO profile(Long adminId) {
        PfAdmin admin = adminId == null ? null : adminMapper.selectById(adminId);
        if (admin == null) {
            throw new BizException(ResultCode.UNAUTHORIZED);
        }
        PfAdminRole role = admin.getRoleId() == null ? null : roleMapper.selectById(admin.getRoleId());
        return new AdminProfileVO(admin.getId(), admin.getUsername(), admin.getRealName(),
                role == null ? null : role.getName(), parsePermissions(role));
    }

    /** 解析角色 permissions(JSON 数组文本)→ 权限码列表;空/异常返回空列表 */
    private List<String> parsePermissions(PfAdminRole role) {
        if (role == null || role.getPermissions() == null || role.getPermissions().isBlank()) {
            return List.of();
        }
        try {
            return objectMapper.readValue(role.getPermissions(), new TypeReference<List<String>>() {
            });
        } catch (Exception e) {
            log.warn("平台角色权限解析失败 roleId={}, 原因={}", role.getId(), e.getMessage());
            return List.of();
        }
    }
}
