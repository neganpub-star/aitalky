package com.aitalky.identity.service.impl;

import com.aitalky.common.api.ResultCode;
import com.aitalky.common.exception.BizException;
import com.aitalky.common.id.SnowflakeIdGenerator;
import com.aitalky.framework.tenant.TenantContext;
import com.aitalky.identity.domain.PermissionCatalog;
import com.aitalky.identity.domain.PermissionView;
import com.aitalky.identity.dto.PermModule;
import com.aitalky.identity.dto.RoleVO;
import com.aitalky.identity.entity.IdMember;
import com.aitalky.identity.entity.IdRole;
import com.aitalky.identity.mapper.IdMemberMapper;
import com.aitalky.identity.mapper.IdRoleMapper;
import com.aitalky.identity.service.RoleService;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Stream;

/**
 * 角色实现。系统预置角色(负责人/管理员/普通成员)只读;自定义角色可增删改权限。
 * <p>权限以 {@code {"pages":[...],"functions":[...]}} JSON 存 id_role.permissions;
 * 保存时按 {@link PermissionCatalog} 过滤越权 token,并据 store 拆回两个数组。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RoleServiceImpl implements RoleService {

    private final IdRoleMapper roleMapper;
    private final IdMemberMapper memberMapper;
    private final ObjectMapper objectMapper;
    private final SnowflakeIdGenerator idGenerator;

    @Override
    public List<RoleVO> list() {
        // 多租户拦截器自动按当前项目过滤;系统角色排前
        return roleMapper.selectList(Wrappers.<IdRole>lambdaQuery().orderByDesc(IdRole::getIsSystem))
                .stream()
                .map(r -> new RoleVO(r.getId(), r.getName(), r.getIsSystem()))
                .toList();
    }

    @Override
    public List<PermModule> catalog() {
        return PermissionCatalog.modules();
    }

    @Override
    public PermissionView permissions(Long roleId) {
        return parse(requireRole(roleId));
    }

    @Override
    public RoleVO create(String name) {
        checkNameDuplicated(name, null);
        IdRole role = new IdRole();
        role.setId(idGenerator.nextId());
        role.setProjectId(TenantContext.getProjectId());
        role.setName(name);
        role.setIsSystem(0);
        role.setPermissions(writeJson(List.of(), List.of()));
        roleMapper.insert(role);
        log.info("新建自定义角色 projectId={}, roleId={}", role.getProjectId(), role.getId());
        return new RoleVO(role.getId(), role.getName(), role.getIsSystem());
    }

    @Override
    public void rename(Long roleId, String name) {
        IdRole role = requireCustomRole(roleId);
        checkNameDuplicated(name, roleId);
        role.setName(name);
        roleMapper.updateById(role);
    }

    @Override
    public void updatePermissions(Long roleId, List<String> pages, List<String> functions) {
        IdRole role = requireCustomRole(roleId);
        // 过滤越权 token,并按目录的 store 把勾选拆回 pages[]/functions[]
        List<String> all = Stream.concat(
                        pages == null ? Stream.<String>empty() : pages.stream(),
                        functions == null ? Stream.<String>empty() : functions.stream())
                .filter(PermissionCatalog.allTokens()::contains)
                .distinct().toList();
        List<String> pageTokens = all.stream().filter(t -> "page".equals(PermissionCatalog.storeOf(t))).toList();
        List<String> funcTokens = all.stream().filter(t -> "function".equals(PermissionCatalog.storeOf(t))).toList();
        role.setPermissions(writeJson(pageTokens, funcTokens));
        roleMapper.updateById(role);
        log.info("保存角色权限 roleId={}, pages={}, functions={}", roleId, pageTokens.size(), funcTokens.size());
    }

    @Override
    public void delete(Long roleId) {
        requireCustomRole(roleId);
        boolean inUse = memberMapper.exists(Wrappers.<IdMember>lambdaQuery().eq(IdMember::getRoleId, roleId));
        if (inUse) {
            throw new BizException(ResultCode.ROLE_IN_USE);
        }
        roleMapper.deleteById(roleId);
    }

    // ===== 辅助 =====
    private IdRole requireRole(Long roleId) {
        IdRole role = roleMapper.selectById(roleId);
        if (role == null) {
            throw new BizException(ResultCode.ROLE_NOT_FOUND);
        }
        return role;
    }

    private IdRole requireCustomRole(Long roleId) {
        IdRole role = requireRole(roleId);
        if (role.getIsSystem() != null && role.getIsSystem() == 1) {
            throw new BizException(ResultCode.ROLE_SYSTEM_READONLY);
        }
        return role;
    }

    private void checkNameDuplicated(String name, Long excludeId) {
        boolean dup = roleMapper.exists(Wrappers.<IdRole>lambdaQuery()
                .eq(IdRole::getName, name)
                .ne(excludeId != null, IdRole::getId, excludeId));
        if (dup) {
            throw new BizException(ResultCode.ROLE_NAME_DUPLICATED);
        }
    }

    private PermissionView parse(IdRole role) {
        // 系统角色权限运行时按目录派生(单一真相,加权限项即对存量项目生效,免迁移)
        if (role.getIsSystem() != null && role.getIsSystem() == 1) {
            PermissionView sys = PermissionCatalog.forRole(role.getName());
            if (sys != null) {
                return sys;
            }
        }
        if (role.getPermissions() == null) {
            return new PermissionView(List.of(), List.of());
        }
        try {
            PermissionView v = objectMapper.readValue(role.getPermissions(), PermissionView.class);
            return new PermissionView(
                    v.pages() == null ? List.of() : v.pages(),
                    v.functions() == null ? List.of() : v.functions());
        } catch (Exception e) {
            log.warn("角色权限解析失败 roleId={}", role.getId());
            return new PermissionView(List.of(), List.of());
        }
    }

    private String writeJson(List<String> pages, List<String> functions) {
        try {
            return objectMapper.writeValueAsString(new PermissionView(pages, functions));
        } catch (Exception e) {
            throw new BizException(ResultCode.SYSTEM_ERROR);
        }
    }
}
