package com.aitalky.identity.service.impl;

import com.aitalky.identity.dto.RoleVO;
import com.aitalky.identity.entity.IdRole;
import com.aitalky.identity.mapper.IdRoleMapper;
import com.aitalky.identity.service.RoleService;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RoleServiceImpl implements RoleService {

    private final IdRoleMapper roleMapper;

    @Override
    public List<RoleVO> list() {
        // 多租户拦截器自动按当前项目过滤;系统角色排前
        return roleMapper.selectList(Wrappers.<IdRole>lambdaQuery().orderByDesc(IdRole::getIsSystem))
                .stream()
                .map(r -> new RoleVO(r.getId(), r.getName(), r.getIsSystem()))
                .toList();
    }
}
