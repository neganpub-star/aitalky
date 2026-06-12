package com.aitalky.platform.service;

import com.aitalky.platform.dto.FunctionDefVO;
import com.aitalky.platform.dto.RoleVO;
import com.aitalky.platform.dto.SaveRoleCmd;

import java.util.List;

/**
 * 平台角色管理:角色 CRUD + 给角色分配功能码(菜单)。
 */
public interface PfAdminRoleService {

    /** 全部可分配功能码(角色勾选项,单一来源=AdminFunction 枚举) */
    List<FunctionDefVO> listFunctions();

    /** 角色列表(含每个角色的管理员引用数) */
    List<RoleVO> listRoles();

    /** 新增/编辑角色(id 为空=新增,按 name 唯一);返回 id */
    Long saveRole(SaveRoleCmd cmd);

    /** 删除角色(仍被管理员引用则拒绝) */
    void deleteRole(Long id);
}
