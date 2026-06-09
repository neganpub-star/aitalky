package com.aitalky.identity.service.impl;

import com.aitalky.common.api.ResultCode;
import com.aitalky.common.exception.BizException;
import com.aitalky.common.id.SnowflakeIdGenerator;
import com.aitalky.framework.security.JwtUtil;
import com.aitalky.framework.security.RsaCryptoService;
import com.aitalky.framework.verify.VerifyScene;
import com.aitalky.framework.verify.VerifyCodeService;
import com.aitalky.identity.dto.LoginCmd;
import com.aitalky.identity.dto.LoginResult;
import com.aitalky.identity.dto.ProjectBrief;
import com.aitalky.identity.dto.RegisterCmd;
import com.aitalky.identity.entity.IdAccount;
import com.aitalky.identity.entity.IdMember;
import com.aitalky.identity.mapper.IdAccountMapper;
import com.aitalky.identity.mapper.IdMemberMapper;
import com.aitalky.identity.mapper.IdProjectMapper;
import com.aitalky.identity.service.AccountService;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * 账号服务实现。
 * <p>无状态:登录只签发 JWT,不存服务端会话。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AccountServiceImpl implements AccountService {

    private final IdAccountMapper accountMapper;
    private final IdMemberMapper memberMapper;
    private final IdProjectMapper projectMapper;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final SnowflakeIdGenerator idGenerator;
    private final VerifyCodeService verifyCodeService;
    private final RsaCryptoService rsaCryptoService;

    @Override
    public void sendCode(VerifyScene scene, String email) {
        verifyCodeService.sendCode(scene, email);
    }

    @Override
    public Long register(RegisterCmd cmd) {
        // 先校验邮箱验证码(万能码开启时可直接用万能码)
        verifyCodeService.verify(VerifyScene.REGISTER, cmd.email(), cmd.code());
        // 邮箱唯一
        boolean exists = accountMapper.exists(
                Wrappers.<IdAccount>lambdaQuery().eq(IdAccount::getEmail, cmd.email()));
        if (exists) {
            throw new BizException(ResultCode.EMAIL_ALREADY_EXISTS);
        }
        // RSA 解密前端传来的密码密文,再校验明文长度
        String rawPassword = rsaCryptoService.decrypt(cmd.password());
        if (rawPassword.length() < 6 || rawPassword.length() > 32) {
            throw new BizException(ResultCode.PARAM_INVALID);
        }
        IdAccount account = new IdAccount();
        account.setId(idGenerator.nextId());
        account.setEmail(cmd.email());
        account.setPasswordHash(passwordEncoder.encode(rawPassword)); // BCrypt,严禁打印
        account.setStatus(1);
        accountMapper.insert(account);
        log.info("账号注册成功 accountId={}, email={}", account.getId(), cmd.email());
        return account.getId();
    }

    @Override
    public LoginResult login(LoginCmd cmd) {
        IdAccount account = accountMapper.selectOne(
                Wrappers.<IdAccount>lambdaQuery().eq(IdAccount::getEmail, cmd.email()));
        // RSA 解密密码密文后比对;账号不存在 / 密码错误 统一返回 LOGIN_FAILED,避免暴露邮箱是否注册
        String rawPassword = rsaCryptoService.decrypt(cmd.password());
        if (account == null || !passwordEncoder.matches(rawPassword, account.getPasswordHash())) {
            throw new BizException(ResultCode.LOGIN_FAILED);
        }
        if (account.getStatus() == null || account.getStatus() != 1) {
            throw new BizException(ResultCode.ACCOUNT_DISABLED);
        }
        // 2FA:校验邮箱验证码(万能码开启时可直接用万能码登录)
        verifyCodeService.verify(VerifyScene.LOGIN, cmd.email(), cmd.code());
        // 账号级令牌:仅含 accountId(尚未选择项目)
        String token = jwtUtil.issue(String.valueOf(account.getId()), Map.of("scope", "account"));
        log.info("账号登录成功 accountId={}", account.getId());
        return new LoginResult(token, account.getId(), account.getEmail(), listProjects(account.getId()));
    }

    /** 账号可进入的项目(它在哪些项目里是成员) */
    private List<ProjectBrief> listProjects(Long accountId) {
        List<IdMember> members = memberMapper.selectList(
                Wrappers.<IdMember>lambdaQuery()
                        .eq(IdMember::getAccountId, accountId)
                        .eq(IdMember::getStatus, 1));
        if (members.isEmpty()) {
            return Collections.emptyList();
        }
        List<Long> projectIds = members.stream().map(IdMember::getProjectId).toList();
        return projectMapper.selectBatchIds(projectIds).stream()
                .map(p -> new ProjectBrief(p.getId(), p.getName(), p.getAppId()))
                .toList();
    }
}
