package com.aitalky.identity.service.impl;

import com.aitalky.common.api.PageResult;
import com.aitalky.common.api.ResultCode;
import com.aitalky.common.exception.BizException;
import com.aitalky.identity.dto.AdminAccountDetailVO;
import com.aitalky.identity.dto.AdminAccountQuery;
import com.aitalky.identity.dto.AdminAccountVO;
import com.aitalky.identity.dto.AdminProjectDetailVO;
import com.aitalky.identity.dto.AdminProjectQuery;
import com.aitalky.identity.dto.AdminProjectVO;
import com.aitalky.identity.entity.IdAccount;
import com.aitalky.identity.entity.IdMember;
import com.aitalky.identity.entity.IdProject;
import com.aitalky.identity.entity.IdRole;
import com.aitalky.identity.mapper.IdAccountMapper;
import com.aitalky.identity.mapper.IdMemberMapper;
import com.aitalky.identity.mapper.IdProjectMapper;
import com.aitalky.identity.mapper.IdRoleMapper;
import com.aitalky.identity.service.AdminViewService;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 平台后管账号/项目管理视图实现(跨租户)。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AdminViewServiceImpl implements AdminViewService {

    private final IdAccountMapper accountMapper;
    private final IdProjectMapper projectMapper;
    private final IdMemberMapper memberMapper;
    private final IdRoleMapper roleMapper;

    @Override
    public PageResult<AdminAccountVO> pageAccounts(AdminAccountQuery q) {
        IPage<IdAccount> page = accountMapper.selectPage(
                Page.of(q.getPage(), q.getSize()),
                Wrappers.<IdAccount>lambdaQuery()
                        .and(StringUtils.hasText(q.getKeyword()), w -> w
                                .like(IdAccount::getEmail, q.getKeyword()).or()
                                .like(IdAccount::getUsername, q.getKeyword()))
                        .eq(q.getStatus() != null, IdAccount::getStatus, q.getStatus())
                        .orderByDesc(IdAccount::getCreateTime));
        List<IdAccount> records = page.getRecords();
        Map<Long, Long> projectCountMap = batchProjectCount(records.stream().map(IdAccount::getId).toList());
        List<AdminAccountVO> vos = records.stream().map(a -> new AdminAccountVO(
                a.getId(), a.getEmail(), a.getUsername(), a.getInviteCode(), a.getStatus(),
                projectCountMap.getOrDefault(a.getId(), 0L).intValue(), a.getCreateTime()
        )).toList();
        return PageResult.of(vos, page.getTotal(), page.getCurrent(), page.getSize());
    }

    @Override
    public AdminAccountDetailVO accountDetail(Long accountId) {
        IdAccount account = accountMapper.selectById(accountId);
        if (account == null) {
            throw new BizException(ResultCode.NOT_FOUND);
        }
        // 该账号在各项目的成员身份
        List<IdMember> members = memberMapper.selectList(
                Wrappers.<IdMember>lambdaQuery().eq(IdMember::getAccountId, accountId));
        Map<Long, String> projectNameMap = batchProjectName(members.stream().map(IdMember::getProjectId).toList());
        Map<Long, String> roleNameMap = batchRoleName(members.stream().map(IdMember::getRoleId).toList());
        List<AdminAccountDetailVO.JoinedProject> projects = members.stream()
                .map(m -> new AdminAccountDetailVO.JoinedProject(
                        m.getProjectId(), projectNameMap.get(m.getProjectId()), m.getNickname(),
                        m.getRoleId(), roleNameMap.get(m.getRoleId()), m.getStatus()))
                .toList();
        return new AdminAccountDetailVO(account.getId(), account.getEmail(), account.getUsername(),
                account.getInviteCode(), account.getInviterAccountId(), account.getStatus(),
                account.getCreateTime(), projects);
    }

    @Override
    public void setAccountStatus(Long accountId, Integer status) {
        IdAccount account = accountMapper.selectById(accountId);
        if (account == null) {
            throw new BizException(ResultCode.NOT_FOUND);
        }
        IdAccount update = new IdAccount();
        update.setId(accountId);
        update.setStatus(status);
        accountMapper.updateById(update);
        log.info("平台后管设置账号状态 accountId={}, status={}", accountId, status);
    }

    @Override
    public PageResult<AdminProjectVO> pageProjects(AdminProjectQuery q) {
        IPage<IdProject> page = projectMapper.selectPage(
                Page.of(q.getPage(), q.getSize()),
                Wrappers.<IdProject>lambdaQuery()
                        .and(StringUtils.hasText(q.getKeyword()), w -> w
                                .like(IdProject::getName, q.getKeyword()).or()
                                .like(IdProject::getAppId, q.getKeyword()))
                        .eq(q.getStatus() != null, IdProject::getStatus, q.getStatus())
                        .eq(StringUtils.hasText(q.getSite()), IdProject::getSite, q.getSite())
                        .orderByDesc(IdProject::getCreateTime));
        List<IdProject> records = page.getRecords();
        Map<Long, String> ownerEmailMap = batchAccountEmail(records.stream().map(IdProject::getOwnerAccountId).toList());
        Map<Long, Long> memberCountMap = batchMemberCount(records.stream().map(IdProject::getId).toList());
        List<AdminProjectVO> vos = records.stream().map(p -> new AdminProjectVO(
                p.getId(), p.getName(), p.getAppId(), p.getOwnerAccountId(),
                ownerEmailMap.get(p.getOwnerAccountId()), p.getSite(), p.getIsPrivate(), p.getStatus(),
                memberCountMap.getOrDefault(p.getId(), 0L).intValue(), p.getCreateTime()
        )).toList();
        return PageResult.of(vos, page.getTotal(), page.getCurrent(), page.getSize());
    }

    @Override
    public AdminProjectDetailVO projectDetail(Long projectId) {
        IdProject p = projectMapper.selectById(projectId);
        if (p == null) {
            throw new BizException(ResultCode.NOT_FOUND);
        }
        String ownerEmail = batchAccountEmail(List.of(p.getOwnerAccountId())).get(p.getOwnerAccountId());
        long memberCount = memberMapper.selectCount(
                Wrappers.<IdMember>lambdaQuery().eq(IdMember::getProjectId, projectId));
        return new AdminProjectDetailVO(p.getId(), p.getName(), p.getAppId(), p.getOwnerAccountId(),
                ownerEmail, p.getSite(), p.getIsPrivate(), p.getStatus(), (int) memberCount, p.getCreateTime());
    }

    @Override
    public void setProjectStatus(Long projectId, Integer status) {
        IdProject project = projectMapper.selectById(projectId);
        if (project == null) {
            throw new BizException(ResultCode.NOT_FOUND);
        }
        IdProject update = new IdProject();
        update.setId(projectId);
        update.setStatus(status);
        projectMapper.updateById(update);
        log.info("平台后管设置项目状态 projectId={}, status={}", projectId, status);
    }

    // ===== 批量辅助(避免 N+1) =====

    /** 账号id → 加入项目数(成员行数) */
    private Map<Long, Long> batchProjectCount(List<Long> accountIds) {
        if (accountIds.isEmpty()) {
            return Map.of();
        }
        return memberMapper.selectList(Wrappers.<IdMember>lambdaQuery()
                        .select(IdMember::getAccountId).in(IdMember::getAccountId, accountIds))
                .stream().collect(Collectors.groupingBy(IdMember::getAccountId, Collectors.counting()));
    }

    /** 项目id → 成员数 */
    private Map<Long, Long> batchMemberCount(List<Long> projectIds) {
        if (projectIds.isEmpty()) {
            return Map.of();
        }
        return memberMapper.selectList(Wrappers.<IdMember>lambdaQuery()
                        .select(IdMember::getProjectId).in(IdMember::getProjectId, projectIds))
                .stream().collect(Collectors.groupingBy(IdMember::getProjectId, Collectors.counting()));
    }

    /** 账号id → 邮箱 */
    private Map<Long, String> batchAccountEmail(List<Long> accountIds) {
        List<Long> ids = accountIds.stream().filter(java.util.Objects::nonNull).distinct().toList();
        if (ids.isEmpty()) {
            return Map.of();
        }
        return accountMapper.selectBatchIds(ids).stream()
                .collect(Collectors.toMap(IdAccount::getId, IdAccount::getEmail, (a, b) -> a));
    }

    /** 项目id → 项目名 */
    private Map<Long, String> batchProjectName(List<Long> projectIds) {
        List<Long> ids = projectIds.stream().filter(java.util.Objects::nonNull).distinct().toList();
        if (ids.isEmpty()) {
            return Map.of();
        }
        return projectMapper.selectBatchIds(ids).stream()
                .collect(Collectors.toMap(IdProject::getId, IdProject::getName, (a, b) -> a));
    }

    /** 角色id → 角色名 */
    private Map<Long, String> batchRoleName(List<Long> roleIds) {
        List<Long> ids = roleIds.stream().filter(java.util.Objects::nonNull).distinct().toList();
        if (ids.isEmpty()) {
            return Map.of();
        }
        return roleMapper.selectBatchIds(ids).stream()
                .collect(Collectors.toMap(IdRole::getId, IdRole::getName, (a, b) -> a));
    }
}
