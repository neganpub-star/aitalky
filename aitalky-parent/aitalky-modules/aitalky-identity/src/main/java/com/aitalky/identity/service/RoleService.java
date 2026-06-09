package com.aitalky.identity.service;

import com.aitalky.identity.dto.RoleVO;

import java.util.List;

/** 角色服务(当前项目范围) */
public interface RoleService {

    /** 角色列表(系统角色 + 自定义角色) */
    List<RoleVO> list();
}
