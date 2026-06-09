package com.aitalky.identity.service.impl;

import com.aitalky.common.api.ResultCode;
import com.aitalky.common.exception.BizException;
import com.aitalky.common.id.SnowflakeIdGenerator;
import com.aitalky.framework.security.JwtUtil;
import com.aitalky.identity.domain.PermissionView;
import com.aitalky.identity.domain.SystemRole;
import com.aitalky.identity.dto.CreateProjectCmd;
import com.aitalky.identity.dto.EnterResult;
import com.aitalky.identity.dto.ProjectBrief;
import com.aitalky.identity.entity.IdAccount;
import com.aitalky.identity.entity.IdMember;
import com.aitalky.identity.entity.IdProject;
import com.aitalky.identity.entity.IdRole;
import com.aitalky.identity.mapper.IdAccountMapper;
import com.aitalky.identity.mapper.IdMemberMapper;
import com.aitalky.identity.mapper.IdProjectMapper;
import com.aitalky.identity.mapper.IdRoleMapper;
import com.aitalky.identity.service.ProjectService;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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

    private final IdProjectMapper projectMapper;
    private final IdRoleMapper roleMapper;
    private final IdMemberMapper memberMapper;
    private final IdAccountMapper accountMapper;
    private final JwtUtil jwtUtil;
    private final SnowflakeIdGenerator idGenerator;
    private final ObjectMapper objectMapper;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ProjectBrief create(Long ownerAccountId, CreateProjectCmd cmd) {
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
        return new ProjectBrief(project.getId(), project.getName(), project.getAppId());
    }

    @Override
    public EnterResult enter(Long accountId, Long projectId) {
        IdMember member = memberMapper.selectOne(Wrappers.<IdMember>lambdaQuery()
                .eq(IdMember::getProjectId, projectId)
                .eq(IdMember::getAccountId, accountId)
                .eq(IdMember::getStatus, 1));
        if (member == null) {
            throw new BizException(ResultCode.NOT_PROJECT_MEMBER);
        }
        IdRole role = roleMapper.selectById(member.getRoleId());
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
