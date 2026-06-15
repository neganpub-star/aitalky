package com.aitalky.identity.service.impl;

import com.aitalky.common.api.PageResult;
import com.aitalky.common.api.ResultCode;
import com.aitalky.common.exception.BizException;
import com.aitalky.common.util.MaskUtil;
import com.aitalky.framework.tenant.TenantContext;
import com.aitalky.identity.dto.MemberAgent;
import com.aitalky.identity.dto.MemberQuery;
import com.aitalky.identity.dto.MemberVO;
import com.aitalky.identity.dto.ProfileVO;
import com.aitalky.identity.dto.PushSettingsVO;
import com.aitalky.identity.entity.IdAccount;
import com.aitalky.identity.entity.IdMember;
import com.aitalky.identity.entity.IdProject;
import com.aitalky.identity.entity.IdRole;
import com.aitalky.identity.mapper.IdAccountMapper;
import com.aitalky.identity.mapper.IdMemberMapper;
import com.aitalky.identity.mapper.IdProjectMapper;
import com.aitalky.identity.mapper.IdRoleMapper;
import com.aitalky.identity.service.MemberService;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 成员管理实现。查询/更新均自动带当前项目(多租户拦截器),无需手写 project_id。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MemberServiceImpl implements MemberService {

    private final IdMemberMapper memberMapper;
    private final IdAccountMapper accountMapper;
    private final IdRoleMapper roleMapper;
    private final IdProjectMapper projectMapper;

    @Override
    public PageResult<MemberVO> page(MemberQuery q) {
        Page<IdMember> page = memberMapper.selectPage(
                Page.of(q.getPage(), q.getSize()),
                Wrappers.<IdMember>lambdaQuery()
                        .eq(q.getRoleId() != null, IdMember::getRoleId, q.getRoleId())
                        // 「在线状态」筛选=工作状态(对齐参考:在线状态即坐席自助工作状态)
                        .eq(q.getOnlineStatus() != null, IdMember::getWorkStatus, q.getOnlineStatus())
                        .eq(q.getStatus() != null, IdMember::getStatus, q.getStatus())
                        .like(StringUtils.hasText(q.getKeyword()), IdMember::getNickname, q.getKeyword())
                        .orderByDesc(IdMember::getCreateTime));

        List<IdMember> records = page.getRecords();
        // 批量补充邮箱(账号)与角色名,避免 N 次查询
        Map<Long, String> emailMap = batchEmail(records);
        Map<Long, String> roleNameMap = batchRoleName(records);

        List<MemberVO> vos = records.stream().map(m -> new MemberVO(
                m.getId(),
                m.getAccountId(),
                MaskUtil.maskEmail(emailMap.get(m.getAccountId())),
                m.getNickname(),
                m.getAvatar(),
                m.getRoleId(),
                roleNameMap.get(m.getRoleId()),
                m.getStatus(),
                m.getOnlineStatus(),
                m.getWorkStatus()
        )).toList();

        return PageResult.of(vos, page.getTotal(), page.getCurrent(), page.getSize());
    }

    @Override
    public void updateRole(Long memberId, Long roleId) {
        IdMember member = requireMember(memberId);
        checkNotOwner(member); // 负责人角色不可改
        member.setRoleId(roleId);
        memberMapper.updateById(member);
    }

    @Override
    public void rename(Long memberId, String nickname) {
        IdMember member = requireMember(memberId);
        member.setNickname(nickname);
        memberMapper.updateById(member);
    }

    @Override
    public void updateAvatar(Long memberId, String avatar) {
        IdMember member = requireMember(memberId);
        member.setAvatar(avatar);
        memberMapper.updateById(member);
    }

    @Override
    public MemberAgent agentOf(Long projectId, Long memberId) {
        if (projectId == null || memberId == null) {
            return null;
        }
        // 信使无成员租户上下文:绕租户 + 显式锁 projectId,避免越权读到别项目成员
        com.baomidou.mybatisplus.core.plugins.InterceptorIgnoreHelper.handle(
                com.baomidou.mybatisplus.core.plugins.IgnoreStrategy.builder().tenantLine(true).build());
        try {
            IdMember m = memberMapper.selectOne(Wrappers.<IdMember>lambdaQuery()
                    .eq(IdMember::getId, memberId)
                    .eq(IdMember::getProjectId, projectId)
                    .eq(IdMember::getStatus, 1));
            return m == null ? null : new MemberAgent(m.getNickname(), m.getAvatar(),
                    m.getWorkStatus() != null && m.getWorkStatus() == 1);
        } finally {
            com.baomidou.mybatisplus.core.plugins.InterceptorIgnoreHelper.clearIgnoreStrategy();
        }
    }

    @Override
    public java.util.List<MemberAgent> agentsOf(Long projectId, boolean onlineOnly, int limit) {
        if (projectId == null || limit <= 0) {
            return java.util.List.of();
        }
        com.baomidou.mybatisplus.core.plugins.InterceptorIgnoreHelper.handle(
                com.baomidou.mybatisplus.core.plugins.IgnoreStrategy.builder().tenantLine(true).build());
        try {
            return memberMapper.selectList(Wrappers.<IdMember>lambdaQuery()
                            .eq(IdMember::getProjectId, projectId)
                            .eq(IdMember::getStatus, 1)
                            .eq(onlineOnly, IdMember::getWorkStatus, 1)
                            .orderByAsc(IdMember::getCreateTime)
                            .last("limit " + limit))
                    .stream()
                    .map(m -> new MemberAgent(m.getNickname(), m.getAvatar(),
                            m.getWorkStatus() != null && m.getWorkStatus() == 1))
                    .toList();
        } finally {
            com.baomidou.mybatisplus.core.plugins.InterceptorIgnoreHelper.clearIgnoreStrategy();
        }
    }

    @Override
    public void updateWorkStatus(Long memberId, Integer workStatus) {
        IdMember member = requireMember(memberId);
        // 归一:非 1 即 0(0离开 1在线)
        member.setWorkStatus(workStatus != null && workStatus == 1 ? 1 : 0);
        memberMapper.updateById(member);
    }

    @Override
    public void updateStatus(Long memberId, Integer status) {
        IdMember member = requireMember(memberId);
        checkNotOwner(member); // 负责人不可被禁用
        member.setStatus(status);
        memberMapper.updateById(member);
    }

    @Override
    public void delete(Long memberId) {
        IdMember member = requireMember(memberId);
        checkNotOwner(member); // 负责人不可被删除
        memberMapper.deleteById(memberId);
    }

    @Override
    public com.aitalky.identity.dto.MemberBrief brief(Long memberId) {
        IdMember m = memberMapper.selectById(memberId);
        return m == null ? null : new com.aitalky.identity.dto.MemberBrief(m.getId(), m.getNickname(), m.getAvatar());
    }

    @Override
    public ProfileVO profile(Long memberId) {
        IdMember m = requireMember(memberId);
        IdAccount account = accountMapper.selectById(m.getAccountId());
        IdProject project = projectMapper.selectById(m.getProjectId());
        IdRole role = roleMapper.selectById(m.getRoleId());
        boolean owner = project != null && project.getOwnerAccountId().equals(m.getAccountId());
        return new ProfileVO(
                account == null ? null : account.getEmail(),
                account == null ? null : account.getUsername(),
                account == null ? null : account.getInviteCode(),
                m.getProjectId(), project == null ? null : project.getName(), owner,
                m.getId(), m.getNickname(), m.getAvatar(), role == null ? null : role.getName(),
                m.getLanguage(), m.getSoundEnabled(), m.getPushEnabled(), m.getWorkStatus());
    }

    @Override
    public PushSettingsVO pushSettings(Long memberId) {
        IdMember m = requireMember(memberId);
        return new PushSettingsVO(
                m.getPushAssignedApp(), m.getPushAssignedWeb(),
                m.getPushUnassignedApp(), m.getPushUnassignedWeb(),
                m.getPushMentionApp(), m.getPushMentionWeb(),
                m.getPushNewCustomerApp(), m.getPushNewCustomerWeb());
    }

    @Override
    public void updatePushSettings(Long memberId, PushSettingsVO s) {
        IdMember m = requireMember(memberId);
        // 整体覆盖 8 个开关(null 归一为关),保证多端一致
        m.setPushAssignedApp(on(s.assignedApp()));
        m.setPushAssignedWeb(on(s.assignedWeb()));
        m.setPushUnassignedApp(on(s.unassignedApp()));
        m.setPushUnassignedWeb(on(s.unassignedWeb()));
        m.setPushMentionApp(on(s.mentionApp()));
        m.setPushMentionWeb(on(s.mentionWeb()));
        m.setPushNewCustomerApp(on(s.newCustomerApp()));
        m.setPushNewCustomerWeb(on(s.newCustomerWeb()));
        memberMapper.updateById(m);
    }

    /** 开关归一:非 1 即 0 */
    private Integer on(Integer v) {
        return v != null && v == 1 ? 1 : 0;
    }

    @Override
    public void updatePreferences(Long memberId, String language, Integer soundEnabled, Integer pushEnabled) {
        IdMember member = requireMember(memberId);
        if (language != null) {
            member.setLanguage(language);
        }
        if (soundEnabled != null) {
            member.setSoundEnabled(soundEnabled);
        }
        if (pushEnabled != null) {
            member.setPushEnabled(pushEnabled);
        }
        memberMapper.updateById(member);
    }

    /** 取成员(自动按当前项目隔离),不存在抛错 */
    private IdMember requireMember(Long memberId) {
        IdMember member = memberMapper.selectById(memberId);
        if (member == null) {
            throw new BizException(ResultCode.MEMBER_NOT_FOUND);
        }
        return member;
    }

    /** 负责人(项目 owner 对应的成员)保护 */
    private void checkNotOwner(IdMember member) {
        IdProject project = projectMapper.selectById(TenantContext.getProjectId());
        if (project != null && project.getOwnerAccountId().equals(member.getAccountId())) {
            throw new BizException(ResultCode.OPERATE_OWNER_FORBIDDEN);
        }
    }

    private Map<Long, String> batchEmail(List<IdMember> members) {
        List<Long> ids = members.stream().map(IdMember::getAccountId).distinct().toList();
        if (ids.isEmpty()) {
            return Map.of();
        }
        return accountMapper.selectBatchIds(ids).stream()
                .collect(Collectors.toMap(IdAccount::getId, IdAccount::getEmail, (a, b) -> a));
    }

    private Map<Long, String> batchRoleName(List<IdMember> members) {
        List<Long> ids = members.stream().map(IdMember::getRoleId).distinct().toList();
        if (ids.isEmpty()) {
            return Map.of();
        }
        return roleMapper.selectBatchIds(ids).stream()
                .collect(Collectors.toMap(IdRole::getId, IdRole::getName, (a, b) -> a));
    }
}
