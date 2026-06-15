package com.aitalky.conversation.service.impl;

import com.aitalky.conversation.dto.AssignConfigVO;
import com.aitalky.conversation.entity.AsnConfig;
import com.aitalky.conversation.entity.AsnGroup;
import com.aitalky.conversation.entity.AsnGroupMember;
import com.aitalky.conversation.mapper.AsnConfigMapper;
import com.aitalky.conversation.mapper.AsnGroupMapper;
import com.aitalky.conversation.mapper.AsnGroupMemberMapper;
import com.aitalky.conversation.service.AssignService;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 会话分配设置实现(基于 asn_* 表)。
 * <p>对外 AssignConfigVO.assignMode 沿用 0手动/1轮流/2负载;asn_config.mode 为 1/2/3,边界处 ±1 映射。
 * <p>普通分配「参与队友」= 项目「普通组」(asn_group.type=1)的成员;普通组首次需要时懒创建。
 * <p>显式按 projectId 读写,兼容分配引擎在无成员租户上下文(客户令牌新建会话)下调用。
 */
@Service
@RequiredArgsConstructor
public class AssignServiceImpl implements AssignService {

    /** 对外默认:轮流(1)、不限(0) */
    private static final int DEFAULT_MODE = 1;
    private static final int DEFAULT_MAX = 0;
    private static final int GROUP_NORMAL = 1; // asn_group.type 普通组

    private final AsnConfigMapper configMapper;
    private final AsnGroupMapper groupMapper;
    private final AsnGroupMemberMapper groupMemberMapper;

    @Override
    public AssignConfigVO getConfig(Long projectId) {
        AsnConfig cfg = findConfig(projectId);
        if (cfg == null) {
            return new AssignConfigVO(DEFAULT_MODE, DEFAULT_MAX);
        }
        return new AssignConfigVO(toVoMode(cfg.getMode()), cfg.getCapacityLimit());
    }

    @Override
    public void updateConfig(Long projectId, Integer assignMode, Integer maxConcurrent) {
        int dbMode = toDbMode(assignMode);
        int max = maxConcurrent == null || maxConcurrent < 0 ? DEFAULT_MAX : maxConcurrent;
        AsnConfig cfg = findConfig(projectId);
        if (cfg == null) {
            cfg = new AsnConfig();
            cfg.setProjectId(projectId);
            cfg.setMode(dbMode);
            cfg.setCapacityLimit(max);
            configMapper.insert(cfg);
        } else {
            cfg.setMode(dbMode);
            cfg.setCapacityLimit(max);
            configMapper.updateById(cfg);
        }
    }

    @Override
    public List<Long> participantIds(Long projectId) {
        Long groupId = normalGroupId(projectId, false);
        if (groupId == null) {
            return List.of();
        }
        return groupMemberMapper.selectList(Wrappers.<AsnGroupMember>lambdaQuery()
                        .eq(AsnGroupMember::getGroupId, groupId))
                .stream().map(AsnGroupMember::getMemberId).toList();
    }

    @Override
    public void addParticipant(Long projectId, Long memberId) {
        Long groupId = normalGroupId(projectId, true);
        boolean exists = groupMemberMapper.exists(Wrappers.<AsnGroupMember>lambdaQuery()
                .eq(AsnGroupMember::getGroupId, groupId)
                .eq(AsnGroupMember::getMemberId, memberId));
        if (exists) {
            return;
        }
        AsnGroupMember m = new AsnGroupMember();
        m.setProjectId(projectId);
        m.setGroupId(groupId);
        m.setMemberId(memberId);
        groupMemberMapper.insert(m);
    }

    @Override
    public void removeParticipant(Long projectId, Long memberId) {
        Long groupId = normalGroupId(projectId, false);
        if (groupId == null) {
            return;
        }
        groupMemberMapper.delete(Wrappers.<AsnGroupMember>lambdaQuery()
                .eq(AsnGroupMember::getGroupId, groupId)
                .eq(AsnGroupMember::getMemberId, memberId));
    }

    @Override
    public Long nextRoundRobin(Long projectId, List<Long> candidatesAsc) {
        if (candidatesAsc == null || candidatesAsc.isEmpty()) {
            return null;
        }
        AsnConfig cfg = findConfig(projectId);
        Long cursor = cfg == null ? null : cfg.getRoundRobinCursor();
        Long picked = candidatesAsc.stream()
                .filter(id -> cursor == null || id > cursor)
                .findFirst()
                .orElse(candidatesAsc.get(0));
        if (cfg == null) {
            cfg = new AsnConfig();
            cfg.setProjectId(projectId);
            cfg.setMode(DEFAULT_MODE == 1 ? 2 : DEFAULT_MODE); // 默认轮流(db=2)
            cfg.setCapacityLimit(DEFAULT_MAX);
            cfg.setRoundRobinCursor(picked);
            configMapper.insert(cfg);
        } else {
            cfg.setRoundRobinCursor(picked);
            configMapper.updateById(cfg);
        }
        return picked;
    }

    private AsnConfig findConfig(Long projectId) {
        return configMapper.selectOne(Wrappers.<AsnConfig>lambdaQuery()
                .eq(AsnConfig::getProjectId, projectId).last("limit 1"));
    }

    /** 取项目普通组(type=1)id;create=true 时不存在则懒创建 */
    private Long normalGroupId(Long projectId, boolean create) {
        AsnGroup g = groupMapper.selectOne(Wrappers.<AsnGroup>lambdaQuery()
                .eq(AsnGroup::getProjectId, projectId)
                .eq(AsnGroup::getType, GROUP_NORMAL).last("limit 1"));
        if (g != null) {
            return g.getId();
        }
        if (!create) {
            return null;
        }
        g = new AsnGroup();
        g.setProjectId(projectId);
        g.setType(GROUP_NORMAL);
        g.setName("普通分配");
        groupMapper.insert(g);
        return g.getId();
    }

    /** asn_config.mode(1手动2轮流3负载) → 对外(0手动1轮流2负载) */
    private int toVoMode(Integer dbMode) {
        return dbMode == null ? DEFAULT_MODE : Math.max(0, dbMode - 1);
    }

    /** 对外(0/1/2) → asn_config.mode(1/2/3) */
    private int toDbMode(Integer voMode) {
        int v = voMode == null ? DEFAULT_MODE : voMode;
        return v + 1;
    }
}
