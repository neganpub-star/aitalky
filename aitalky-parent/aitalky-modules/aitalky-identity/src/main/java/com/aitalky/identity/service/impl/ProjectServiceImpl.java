package com.aitalky.identity.service.impl;

import com.aitalky.common.api.ResultCode;
import com.aitalky.common.exception.BizException;
import com.aitalky.common.id.SnowflakeIdGenerator;
import com.aitalky.framework.security.JwtUtil;
import com.aitalky.framework.security.RsaCryptoService;
import com.aitalky.framework.tenant.TenantContext;
import com.aitalky.framework.verify.VerifyCodeService;
import com.aitalky.framework.verify.VerifyScene;
import com.aitalky.identity.domain.PermissionView;
import com.aitalky.identity.domain.SystemRole;
import com.aitalky.identity.dto.CreateProjectCmd;
import com.aitalky.identity.dto.DeactivateProjectCmd;
import com.aitalky.identity.dto.EnterResult;
import com.aitalky.identity.dto.ProjectBrief;
import com.aitalky.identity.dto.ProjectDetailVO;
import com.aitalky.identity.dto.TransferOwnerCmd;
import com.aitalky.identity.dto.UpdateProjectCmd;
import com.aitalky.identity.entity.IdAccount;
import com.aitalky.identity.entity.IdMember;
import com.aitalky.identity.entity.IdProject;
import com.aitalky.identity.entity.IdRole;
import com.aitalky.identity.mapper.IdAccountMapper;
import com.aitalky.identity.mapper.IdMemberMapper;
import com.aitalky.identity.mapper.IdProjectMapper;
import com.aitalky.identity.mapper.IdRoleMapper;
import com.aitalky.identity.service.ProjectService;
import com.baomidou.mybatisplus.core.plugins.IgnoreStrategy;
import com.baomidou.mybatisplus.core.plugins.InterceptorIgnoreHelper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;

/**
 * 项目服务实现。
 * <p>创建项目是「开通工作台」的核心:一次性把项目 + 3 系统角色 + owner 成员建好,放在同一事务保证一致。
 * <p>(信使配置 mse_messenger、会话设置 asn_config 的默认初始化,由对应模块在 app 编排层接力,本模块只管 id_ 表。)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ProjectServiceImpl implements ProjectService {

    private static final String APP_ID_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    private static final int APP_ID_LEN = 10;
    private static final SecureRandom RANDOM = new SecureRandom();

    private static final String OWNER_ROLE_NAME = "负责人";
    private static final String ADMIN_ROLE_NAME = "管理员";

    private final IdProjectMapper projectMapper;
    private final IdRoleMapper roleMapper;
    private final IdMemberMapper memberMapper;
    private final IdAccountMapper accountMapper;
    private final JwtUtil jwtUtil;
    private final SnowflakeIdGenerator idGenerator;
    private final ObjectMapper objectMapper;
    private final PasswordEncoder passwordEncoder;
    private final RsaCryptoService rsaCryptoService;
    private final VerifyCodeService verifyCodeService;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ProjectBrief create(Long ownerAccountId, CreateProjectCmd cmd) {
        // 0) 邮箱验证码二次验证(发到账号自身邮箱;开发期万能码 888888 可过)
        IdAccount account = accountMapper.selectById(ownerAccountId);
        if (account == null) {
            throw new BizException(ResultCode.NOT_FOUND);
        }
        verifyCodeService.verify(VerifyScene.SENSITIVE, account.getEmail(), cmd.code());

        // 1) 项目
        IdProject project = new IdProject();
        project.setId(idGenerator.nextId());
        project.setName(cmd.name());
        project.setAppId(generateUniqueAppId());
        project.setOwnerAccountId(ownerAccountId);
        project.setSite("cn");
        project.setIsPrivate(0);
        project.setStatus(1);
        projectMapper.insert(project);

        // 2) 预置 3 个系统角色,记下 owner 角色id
        Long ownerRoleId = null;
        for (SystemRole sr : SystemRole.values()) {
            IdRole role = new IdRole();
            role.setId(idGenerator.nextId());
            role.setProjectId(project.getId());
            role.setName(sr.getRoleName());
            role.setIsSystem(1);
            role.setPermissions(sr.getPermissions());
            roleMapper.insert(role);
            if (sr == SystemRole.OWNER) {
                ownerRoleId = role.getId();
            }
        }

        // 3) 创建者作为 owner 成员
        IdMember owner = new IdMember();
        owner.setId(idGenerator.nextId());
        owner.setProjectId(project.getId());
        owner.setAccountId(ownerAccountId);
        owner.setRoleId(ownerRoleId);
        owner.setNickname(defaultNickname(ownerAccountId));
        owner.setStatus(1);
        owner.setOnlineStatus(0);
        owner.setWorkStatus(0);
        owner.setLanguage("zh_CN");
        owner.setSoundEnabled(1);
        owner.setPushEnabled(1);
        memberMapper.insert(owner);

        log.info("项目创建成功 projectId={}, appId={}, owner={}", project.getId(), project.getAppId(), ownerAccountId);
        return new ProjectBrief(project.getId(), project.getName(), project.getAppId(), project.getLogo());
    }

    @Override
    public EnterResult enter(Long accountId, Long projectId) {
        // 进入/切换项目是「跨项目」查询:用 token 里的 accountId 找目标项目的成员行。
        // 此处临时关闭租户过滤——否则带项目级令牌切到别的项目时,插件会拼上旧 project_id 致查不到。
        // 安全:where 同时锁定 project_id=目标 且 account_id=本账号,只命中本账号在目标项目的成员,不泄露他人/他项目数据。
        // 成员行 + 角色都按目标 projectId 显式查询,跨项目查 id_role 同样要绕过租户(否则角色查不到→无功能权限)
        IdMember member;
        IdRole role;
        InterceptorIgnoreHelper.handle(IgnoreStrategy.builder().tenantLine(true).build());
        try {
            member = memberMapper.selectOne(Wrappers.<IdMember>lambdaQuery()
                    .eq(IdMember::getProjectId, projectId)
                    .eq(IdMember::getAccountId, accountId)
                    .eq(IdMember::getStatus, 1));
            if (member == null) {
                throw new BizException(ResultCode.NOT_PROJECT_MEMBER);
            }
            // 角色额外校验属于目标项目,杜绝越权拿到别项目同 id 角色
            role = roleMapper.selectOne(Wrappers.<IdRole>lambdaQuery()
                    .eq(IdRole::getId, member.getRoleId())
                    .eq(IdRole::getProjectId, projectId));
        } finally {
            InterceptorIgnoreHelper.clearIgnoreStrategy();
        }
        Set<String> functions = parseFunctions(role);

        // 项目级令牌:携带租户隔离与功能鉴权所需信息
        String token = jwtUtil.issue(String.valueOf(accountId), Map.of(
                "scope", "project",
                "projectId", projectId,
                "memberId", member.getId(),
                "roleId", member.getRoleId(),
                "functions", functions));
        log.info("进入项目 accountId={}, projectId={}, memberId={}", accountId, projectId, member.getId());
        return new EnterResult(token, projectId, member.getId(), member.getRoleId(),
                role == null ? null : role.getName(), functions);
    }

    @Override
    public IdProject findByAppId(String appId) {
        return projectMapper.selectOne(Wrappers.<IdProject>lambdaQuery()
                .eq(IdProject::getAppId, appId)
                .eq(IdProject::getStatus, 1)
                .last("limit 1"));
    }

    @Override
    public IdProject getById(Long id) {
        return projectMapper.selectById(id);
    }

    /** 解析角色权限 JSON 取 functions;解析失败返回空集合(不影响进入,只是无功能权限) */
    private Set<String> parseFunctions(IdRole role) {
        if (role == null || role.getPermissions() == null) {
            return Set.of();
        }
        try {
            PermissionView view = objectMapper.readValue(role.getPermissions(), PermissionView.class);
            return view.functions() == null ? Set.of() : new LinkedHashSet<>(view.functions());
        } catch (Exception e) {
            log.warn("角色权限解析失败 roleId={}", role.getId());
            return Set.of();
        }
    }

    /** 取账号邮箱前缀作为 owner 默认昵称;取不到则用通用名 */
    private String defaultNickname(Long accountId) {
        IdAccount account = accountMapper.selectById(accountId);
        if (account != null && account.getEmail() != null) {
            int at = account.getEmail().indexOf('@');
            return at > 0 ? account.getEmail().substring(0, at) : account.getEmail();
        }
        return "负责人";
    }

    // ====================================================================
    // 基本信息 / 负责人转让 / 注销(团队设置 → 基本信息)
    // ====================================================================

    @Override
    public ProjectDetailVO currentDetail() {
        Long projectId = TenantContext.getProjectId();
        IdProject p = projectMapper.selectById(projectId);
        if (p == null) {
            throw new BizException(ResultCode.PROJECT_NOT_FOUND);
        }
        boolean isOwner = p.getOwnerAccountId().equals(TenantContext.getAccountId());
        IdMember ownerMember = memberMapper.selectOne(Wrappers.<IdMember>lambdaQuery()
                .eq(IdMember::getProjectId, projectId)
                .eq(IdMember::getAccountId, p.getOwnerAccountId()).last("limit 1"));
        return new ProjectDetailVO(p.getId(), p.getName(), p.getLogo(), p.getAppId(),
                ownerMember == null ? null : ownerMember.getId(), isOwner);
    }

    @Override
    public void update(UpdateProjectCmd cmd) {
        IdProject p = requireOwnerProject();
        p.setName(cmd.name());
        p.setLogo(cmd.logo());
        projectMapper.updateById(p);
        log.info("更新项目基本信息 projectId={}", p.getId());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void transferOwner(TransferOwnerCmd cmd) {
        IdProject p = requireOwnerProject();
        IdAccount owner = accountMapper.selectById(p.getOwnerAccountId());
        verifyDanger(p, owner, cmd.projectName(), cmd.password(), cmd.code());

        IdMember newOwner = memberMapper.selectById(cmd.newOwnerMemberId());
        if (newOwner == null || !newOwner.getProjectId().equals(p.getId())) {
            throw new BizException(ResultCode.MEMBER_NOT_FOUND);
        }
        if (newOwner.getAccountId().equals(p.getOwnerAccountId())) {
            throw new BizException(ResultCode.PARAM_INVALID); // 不能转给自己
        }
        Long ownerRoleId = systemRoleId(p.getId(), OWNER_ROLE_NAME);
        Long adminRoleId = systemRoleId(p.getId(), ADMIN_ROLE_NAME);

        // 新负责人 → 负责人角色;原负责人 → 管理员角色
        newOwner.setRoleId(ownerRoleId);
        memberMapper.updateById(newOwner);
        IdMember oldOwner = memberMapper.selectOne(Wrappers.<IdMember>lambdaQuery()
                .eq(IdMember::getProjectId, p.getId())
                .eq(IdMember::getAccountId, p.getOwnerAccountId()).last("limit 1"));
        if (oldOwner != null) {
            oldOwner.setRoleId(adminRoleId);
            memberMapper.updateById(oldOwner);
        }
        p.setOwnerAccountId(newOwner.getAccountId());
        projectMapper.updateById(p);
        log.info("负责人转让 projectId={}, newOwnerMemberId={}", p.getId(), newOwner.getId());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deactivate(DeactivateProjectCmd cmd) {
        IdProject p = requireOwnerProject();
        IdAccount owner = accountMapper.selectById(p.getOwnerAccountId());
        verifyDanger(p, owner, cmd.projectName(), cmd.password(), cmd.code());
        // 逻辑删除:项目 + 全部成员 + 全部角色(数据保留在库,del_flag=1)
        memberMapper.delete(Wrappers.<IdMember>lambdaQuery().eq(IdMember::getProjectId, p.getId()));
        roleMapper.delete(Wrappers.<IdRole>lambdaQuery().eq(IdRole::getProjectId, p.getId()));
        projectMapper.deleteById(p.getId());
        log.warn("项目已注销 projectId={}", p.getId());
    }

    /** 取当前项目并校验登录者为负责人,否则拒绝 */
    private IdProject requireOwnerProject() {
        IdProject p = projectMapper.selectById(TenantContext.getProjectId());
        if (p == null) {
            throw new BizException(ResultCode.PROJECT_NOT_FOUND);
        }
        if (!p.getOwnerAccountId().equals(TenantContext.getAccountId())) {
            throw new BizException(ResultCode.OWNER_ONLY);
        }
        return p;
    }

    /** 危险操作二次校验:项目名一致 + 负责人登录密码 + 邮箱验证码 */
    private void verifyDanger(IdProject project, IdAccount owner, String projectName, String passwordCipher, String code) {
        if (projectName == null || !projectName.equals(project.getName())) {
            throw new BizException(ResultCode.PARAM_INVALID);
        }
        if (owner == null) {
            throw new BizException(ResultCode.SYSTEM_ERROR);
        }
        String raw = rsaCryptoService.decrypt(passwordCipher);
        if (!passwordEncoder.matches(raw, owner.getPasswordHash())) {
            throw new BizException(ResultCode.OLD_PASSWORD_ERROR);
        }
        verifyCodeService.verify(VerifyScene.SENSITIVE, owner.getEmail(), code);
    }

    private Long systemRoleId(Long projectId, String name) {
        IdRole role = roleMapper.selectOne(Wrappers.<IdRole>lambdaQuery()
                .eq(IdRole::getProjectId, projectId)
                .eq(IdRole::getIsSystem, 1)
                .eq(IdRole::getName, name).last("limit 1"));
        if (role == null) {
            throw new BizException(ResultCode.ROLE_NOT_FOUND);
        }
        return role.getId();
    }

    /** 生成全局唯一 appId(随机串,碰撞极低,仍做唯一性校验重试) */
    private String generateUniqueAppId() {
        for (int attempt = 0; attempt < 5; attempt++) {
            StringBuilder sb = new StringBuilder(APP_ID_LEN);
            for (int i = 0; i < APP_ID_LEN; i++) {
                sb.append(APP_ID_CHARS.charAt(RANDOM.nextInt(APP_ID_CHARS.length())));
            }
            String appId = sb.toString();
            boolean exists = projectMapper.exists(
                    Wrappers.<IdProject>lambdaQuery().eq(IdProject::getAppId, appId));
            if (!exists) {
                return appId;
            }
        }
        throw new BizException(ResultCode.SYSTEM_ERROR);
    }
}
