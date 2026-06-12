package com.aitalky.platform.service.impl;

import com.aitalky.common.api.PageResult;
import com.aitalky.common.api.ResultCode;
import com.aitalky.common.exception.BizException;
import com.aitalky.common.id.SnowflakeIdGenerator;
import com.aitalky.platform.dto.AdminQuery;
import com.aitalky.platform.dto.AdminVO;
import com.aitalky.platform.dto.SaveAdminCmd;
import com.aitalky.platform.entity.PfAdmin;
import com.aitalky.platform.entity.PfAdminRole;
import com.aitalky.platform.mapper.PfAdminMapper;
import com.aitalky.platform.mapper.PfAdminRoleMapper;
import com.aitalky.platform.service.PfAdminManageService;
import com.aitalky.framework.security.RsaCryptoService;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 平台管理员账号管理实现。
 * <p>密码:前端 RSA 加密传输 → 此处解密 → BCrypt 哈希入库;明文/哈希绝不打日志。
 * <p>自我保护:不可禁用/删除当前登录账号,避免把自己锁在外面。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PfAdminManageServiceImpl implements PfAdminManageService {

    private final PfAdminMapper adminMapper;
    private final PfAdminRoleMapper roleMapper;
    private final SnowflakeIdGenerator idGenerator;
    private final PasswordEncoder passwordEncoder;
    private final RsaCryptoService rsaCryptoService;

    @Override
    public PageResult<AdminVO> pageAdmins(AdminQuery q) {
        IPage<PfAdmin> page = adminMapper.selectPage(
                Page.of(q.getPage(), q.getSize()),
                Wrappers.<PfAdmin>lambdaQuery()
                        .and(StringUtils.hasText(q.getKeyword()), w -> w
                                .like(PfAdmin::getUsername, q.getKeyword()).or()
                                .like(PfAdmin::getRealName, q.getKeyword()))
                        .eq(q.getStatus() != null, PfAdmin::getStatus, q.getStatus())
                        .orderByDesc(PfAdmin::getCreateTime));
        List<PfAdmin> records = page.getRecords();
        Map<Long, String> roleNameMap = batchRoleName(records.stream().map(PfAdmin::getRoleId).toList());
        List<AdminVO> vos = records.stream().map(a -> new AdminVO(
                a.getId(), a.getUsername(), a.getRealName(), a.getRoleId(),
                a.getRoleId() == null ? null : roleNameMap.get(a.getRoleId()),
                a.getStatus(), a.getCreateTime()
        )).toList();
        return PageResult.of(vos, page.getTotal(), page.getCurrent(), page.getSize());
    }

    @Override
    public Long saveAdmin(SaveAdminCmd cmd) {
        // 校验角色存在
        if (roleMapper.selectById(cmd.roleId()) == null) {
            throw new BizException(ResultCode.ROLE_NOT_FOUND);
        }
        // 用户名唯一(排除自身)
        Long dup = adminMapper.selectCount(Wrappers.<PfAdmin>lambdaQuery()
                .eq(PfAdmin::getUsername, cmd.username())
                .ne(cmd.id() != null, PfAdmin::getId, cmd.id()));
        if (dup != null && dup > 0) {
            throw new BizException(ResultCode.DATA_DUPLICATED);
        }
        if (cmd.id() == null) {
            // 新增:密码必填
            if (!StringUtils.hasText(cmd.password())) {
                throw new BizException(ResultCode.PARAM_INVALID);
            }
            PfAdmin admin = new PfAdmin();
            admin.setId(idGenerator.nextId());
            admin.setUsername(cmd.username());
            admin.setPasswordHash(passwordEncoder.encode(rsaCryptoService.decrypt(cmd.password())));
            admin.setRealName(cmd.realName());
            admin.setRoleId(cmd.roleId());
            admin.setStatus(cmd.status() == null ? 1 : cmd.status());
            adminMapper.insert(admin);
            log.info("平台管理员新增 id={}, username={}", admin.getId(), cmd.username());
            return admin.getId();
        }
        // 编辑:username/password 不在此改;只更新姓名/角色/状态
        PfAdmin exist = adminMapper.selectById(cmd.id());
        if (exist == null) {
            throw new BizException(ResultCode.NOT_FOUND);
        }
        PfAdmin update = new PfAdmin();
        update.setId(cmd.id());
        update.setRealName(cmd.realName());
        update.setRoleId(cmd.roleId());
        if (cmd.status() != null) {
            update.setStatus(cmd.status());
        }
        adminMapper.updateById(update);
        log.info("平台管理员编辑 id={}", cmd.id());
        return cmd.id();
    }

    @Override
    public void updateStatus(Long id, Integer status, Long currentAdminId) {
        if (id.equals(currentAdminId)) {
            throw new BizException(ResultCode.OPERATE_OWNER_FORBIDDEN);
        }
        PfAdmin admin = adminMapper.selectById(id);
        if (admin == null) {
            throw new BizException(ResultCode.NOT_FOUND);
        }
        PfAdmin update = new PfAdmin();
        update.setId(id);
        update.setStatus(status);
        adminMapper.updateById(update);
        log.info("平台管理员状态变更 id={}, status={}", id, status);
    }

    @Override
    public void resetPassword(Long id, String rawEncrypted) {
        PfAdmin admin = adminMapper.selectById(id);
        if (admin == null) {
            throw new BizException(ResultCode.NOT_FOUND);
        }
        PfAdmin update = new PfAdmin();
        update.setId(id);
        update.setPasswordHash(passwordEncoder.encode(rsaCryptoService.decrypt(rawEncrypted)));
        adminMapper.updateById(update);
        log.info("平台管理员重置密码 id={}", id);
    }

    @Override
    public void deleteAdmin(Long id, Long currentAdminId) {
        if (id.equals(currentAdminId)) {
            throw new BizException(ResultCode.OPERATE_OWNER_FORBIDDEN);
        }
        if (adminMapper.selectById(id) == null) {
            throw new BizException(ResultCode.NOT_FOUND);
        }
        adminMapper.deleteById(id);
        log.info("平台管理员删除 id={}", id);
    }

    /** 批量取角色名,避免 N+1 */
    private Map<Long, String> batchRoleName(List<Long> roleIds) {
        List<Long> ids = roleIds.stream().filter(java.util.Objects::nonNull).distinct().toList();
        if (ids.isEmpty()) {
            return Map.of();
        }
        return roleMapper.selectBatchIds(ids).stream()
                .collect(Collectors.toMap(PfAdminRole::getId, PfAdminRole::getName, (a, b) -> a));
    }
}
