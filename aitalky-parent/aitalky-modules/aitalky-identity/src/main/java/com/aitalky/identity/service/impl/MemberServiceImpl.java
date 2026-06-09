package com.aitalky.identity.service.impl;

import com.aitalky.common.api.PageResult;
import com.aitalky.common.api.ResultCode;
import com.aitalky.common.exception.BizException;
import com.aitalky.common.util.MaskUtil;
import com.aitalky.framework.tenant.TenantContext;
import com.aitalky.identity.dto.MemberQuery;
import com.aitalky.identity.dto.MemberVO;
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
                        .eq(q.getOnlineStatus() != null, IdMember::getOnlineStatus, q.getOnlineStatus())
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
