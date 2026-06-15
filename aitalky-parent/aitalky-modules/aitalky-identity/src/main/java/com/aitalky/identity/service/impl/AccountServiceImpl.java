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
import com.baomidou.mybatisplus.core.plugins.IgnoreStrategy;
import com.baomidou.mybatisplus.core.plugins.InterceptorIgnoreHelper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;

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
        account.setUsername(cmd.email().split("@")[0]); // 默认用户名=邮箱前缀,后续可在个人中心修改
        account.setInviteCode(generateUniqueInviteCode());
        account.setInviterAccountId(resolveInviter(cmd.inviteCode()));
        account.setPasswordHash(passwordEncoder.encode(rawPassword)); // BCrypt,严禁打印
        account.setStatus(1);
        accountMapper.insert(account);
        log.info("账号注册成功 accountId={}, email={}", account.getId(), cmd.email());
        return account.getId();
    }

    /** 解析注册时所填邀请码归属(选填:为空不处理;填了但无效则报错) */
    private Long resolveInviter(String inviteCode) {
        if (inviteCode == null || inviteCode.isBlank()) {
            return null;
        }
        IdAccount inviter = accountMapper.selectOne(
                Wrappers.<IdAccount>lambdaQuery().eq(IdAccount::getInviteCode, inviteCode.trim()));
        if (inviter == null) {
            throw new BizException(ResultCode.INVITE_CODE_INVALID);
        }
        return inviter.getId();
    }

    /** 邀请码字符集(去掉易混淆的 0/O/1/I/L) */
    private static final char[] INVITE_CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789".toCharArray();

    /** 生成全局唯一的 8 位邀请码(碰撞重试) */
    private String generateUniqueInviteCode() {
        for (int attempt = 0; attempt < 10; attempt++) {
            StringBuilder sb = new StringBuilder(8);
            for (int i = 0; i < 8; i++) {
                sb.append(INVITE_CODE_CHARS[ThreadLocalRandom.current().nextInt(INVITE_CODE_CHARS.length)]);
            }
            String code = sb.toString();
            boolean exists = accountMapper.exists(
                    Wrappers.<IdAccount>lambdaQuery().eq(IdAccount::getInviteCode, code));
            if (!exists) {
                return code;
            }
        }
        throw new BizException(ResultCode.SYSTEM_ERROR);
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
    @Override
    public List<ProjectBrief> myProjects(Long accountId) {
        // 可能在项目级令牌下调用(切换项目下拉/加入后刷新):id_member 受租户过滤,绕租户跨项目查
        InterceptorIgnoreHelper.handle(IgnoreStrategy.builder().tenantLine(true).build());
        try {
            return listProjects(accountId);
        } finally {
            InterceptorIgnoreHelper.clearIgnoreStrategy();
        }
    }

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
                .map(p -> new ProjectBrief(p.getId(), p.getName(), p.getAppId(), p.getLogo()))
                .toList();
    }

    @Override
    public void updateUsername(Long accountId, String username) {
        String v = username == null ? "" : username.trim();
        if (v.isEmpty() || v.length() > 64) {
            throw new BizException(ResultCode.PARAM_INVALID);
        }
        IdAccount account = requireAccount(accountId);
        account.setUsername(v);
        accountMapper.updateById(account);
        log.info("账号修改用户名 accountId={}", accountId);
    }

    @Override
    public void changeEmail(Long accountId, String newEmail, String code) {
        // 校验发往「新邮箱」的验证码(复用 REGISTER 场景=证明拥有该邮箱)
        verifyCodeService.verify(VerifyScene.REGISTER, newEmail, code);
        boolean exists = accountMapper.exists(Wrappers.<IdAccount>lambdaQuery()
                .eq(IdAccount::getEmail, newEmail)
                .ne(IdAccount::getId, accountId));
        if (exists) {
            throw new BizException(ResultCode.EMAIL_ALREADY_EXISTS);
        }
        IdAccount account = requireAccount(accountId);
        account.setEmail(newEmail);
        accountMapper.updateById(account);
        log.info("账号更改邮箱成功 accountId={}", accountId);
    }

    @Override
    public void changePassword(Long accountId, String oldPasswordCipher, String newPasswordCipher) {
        IdAccount account = requireAccount(accountId);
        // 校验旧密码(RSA 解密后比对 BCrypt)
        String oldRaw = rsaCryptoService.decrypt(oldPasswordCipher);
        if (!passwordEncoder.matches(oldRaw, account.getPasswordHash())) {
            throw new BizException(ResultCode.OLD_PASSWORD_ERROR);
        }
        updatePasswordHash(account, newPasswordCipher);
        log.info("账号更改密码成功 accountId={}", accountId);
    }

    @Override
    public void resetPassword(Long accountId, String code, String newPasswordCipher) {
        IdAccount account = requireAccount(accountId);
        // 验证码发往本账号邮箱(忘记旧密码场景)
        verifyCodeService.verify(VerifyScene.RESET_PWD, account.getEmail(), code);
        updatePasswordHash(account, newPasswordCipher);
        log.info("账号重置密码成功 accountId={}", accountId);
    }

    /** RSA 解密新密码 → 校验明文长度 → 更新 BCrypt 哈希(严禁打印明文) */
    private void updatePasswordHash(IdAccount account, String newPasswordCipher) {
        String newRaw = rsaCryptoService.decrypt(newPasswordCipher);
        if (newRaw.length() < 6 || newRaw.length() > 32) {
            throw new BizException(ResultCode.PARAM_INVALID);
        }
        account.setPasswordHash(passwordEncoder.encode(newRaw));
        accountMapper.updateById(account);
    }

    /** 取账号,不存在视为登录态异常 */
    private IdAccount requireAccount(Long accountId) {
        IdAccount account = accountMapper.selectById(accountId);
        if (account == null) {
            throw new BizException(ResultCode.UNAUTHORIZED);
        }
        return account;
    }
}
