package com.aitalky.identity.service;

import com.aitalky.identity.domain.PermissionView;
import com.aitalky.identity.dto.PermModule;
import com.aitalky.identity.dto.RoleVO;

import java.util.List;

/** 角色服务(当前项目范围):列表 + 权限树 CRUD */
public interface RoleService {

    /** 角色列表(系统角色 + 自定义角色) */
    List<RoleVO> list();

    /** 权限目录(模块/页面/功能,渲染权限树用) */
    List<PermModule> catalog();

    /** 某角色已勾选的权限(pages + functions) */
    PermissionView permissions(Long roleId);

    /** 新建自定义角色,返回角色项 */
    RoleVO create(String name);

    /** 重命名自定义角色(系统角色不可改) */
    void rename(Long roleId, String name);

    /** 保存自定义角色权限(系统角色不可改) */
    void updatePermissions(Long roleId, List<String> pages, List<String> functions);

    /** 删除自定义角色(系统角色不可删;角色下有成员不可删) */
    void delete(Long roleId);
}
