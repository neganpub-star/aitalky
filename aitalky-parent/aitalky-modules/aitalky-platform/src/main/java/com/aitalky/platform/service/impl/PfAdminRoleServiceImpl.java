package com.aitalky.platform.service.impl;

import com.aitalky.common.api.ResultCode;
import com.aitalky.common.exception.BizException;
import com.aitalky.common.id.SnowflakeIdGenerator;
import com.aitalky.platform.constant.AdminFunction;
import com.aitalky.platform.dto.FunctionDefVO;
import com.aitalky.platform.dto.RoleVO;
import com.aitalky.platform.dto.SaveRoleCmd;
import com.aitalky.platform.entity.PfAdmin;
import com.aitalky.platform.entity.PfAdminRole;
import com.aitalky.platform.mapper.PfAdminMapper;
import com.aitalky.platform.mapper.PfAdminRoleMapper;
import com.aitalky.platform.service.PfAdminRoleService;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 平台角色管理实现。
 * <p>permissions 存为 JSON 数组文本(与登录解析逻辑对称);保存时按合法功能码过滤,防止脏数据混入。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PfAdminRoleServiceImpl implements PfAdminRoleService {

    private final PfAdminRoleMapper roleMapper;
    private final PfAdminMapper adminMapper;
    private final SnowflakeIdGenerator idGenerator;
    private final ObjectMapper objectMapper;

    @Override
    public List<FunctionDefVO> listFunctions() {
        return AdminFunction.all().stream()
                .map(f -> new FunctionDefVO(f.getCode(), f.getZhName(), f.getEnName()))
                .toList();
    }

    @Override
    public List<RoleVO> listRoles() {
        List<PfAdminRole> roles = roleMapper.selectList(
                Wrappers.<PfAdminRole>lambdaQuery().orderByAsc(PfAdminRole::getId));
        return roles.stream().map(r -> new RoleVO(
                r.getId(), r.getName(), parsePermissions(r.getPermissions()),
                countAdmins(r.getId()), r.getCreateTime()
        )).toList();
    }

    @Override
    public Long saveRole(SaveRoleCmd cmd) {
        // 角色名唯一(排除自身)
        Long dup = roleMapper.selectCount(Wrappers.<PfAdminRole>lambdaQuery()
                .eq(PfAdminRole::getName, cmd.name())
                .ne(cmd.id() != null, PfAdminRole::getId, cmd.id()));
        if (dup != null && dup > 0) {
            throw new BizException(ResultCode.ROLE_NAME_DUPLICATED);
        }
        // 只保留合法功能码(以 AdminFunction 为准,过滤前端可能传入的脏值)
        Set<String> valid = AdminFunction.all().stream().map(AdminFunction::getCode).collect(Collectors.toSet());
        List<String> perms = (cmd.permissions() == null ? List.<String>of() : cmd.permissions())
                .stream().filter(valid::contains).distinct().toList();

        PfAdminRole role = new PfAdminRole();
        role.setName(cmd.name());
        role.setPermissions(writePermissions(perms));
        if (cmd.id() == null) {
            role.setId(idGenerator.nextId());
            roleMapper.insert(role);
        } else {
            role.setId(cmd.id());
            roleMapper.updateById(role);
        }
        log.info("平台角色保存 id={}, name={}, perms={}", role.getId(), cmd.name(), perms);
        return role.getId();
    }

    @Override
    public void deleteRole(Long id) {
        PfAdminRole role = roleMapper.selectById(id);
        if (role == null) {
            throw new BizException(ResultCode.ROLE_NOT_FOUND);
        }
        if (countAdmins(id) > 0) {
            throw new BizException(ResultCode.ROLE_IN_USE);
        }
        roleMapper.deleteById(id);
        log.info("平台角色删除 id={}", id);
    }

    /** 统计引用该角色的管理员数 */
    private int countAdmins(Long roleId) {
        Long c = adminMapper.selectCount(Wrappers.<PfAdmin>lambdaQuery().eq(PfAdmin::getRoleId, roleId));
        return c == null ? 0 : c.intValue();
    }

    private List<String> parsePermissions(String json) {
        if (json == null || json.isBlank()) {
            return List.of();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<List<String>>() {
            });
        } catch (Exception e) {
            log.warn("角色权限解析失败 json={}, 原因={}", json, e.getMessage());
            return List.of();
        }
    }

    private String writePermissions(List<String> perms) {
        try {
            return objectMapper.writeValueAsString(perms);
        } catch (Exception e) {
            // 序列化失败兜底为空数组,避免写入非法 JSON
            log.warn("角色权限序列化失败,原因={}", e.getMessage());
            return "[]";
        }
    }
}
