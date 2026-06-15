package com.aitalky.conversation.service.impl;

import com.aitalky.conversation.dto.AssignConfigVO;
import com.aitalky.conversation.entity.CnvAssignConfig;
import com.aitalky.conversation.entity.CnvAssignMember;
import com.aitalky.conversation.mapper.CnvAssignConfigMapper;
import com.aitalky.conversation.mapper.CnvAssignMemberMapper;
import com.aitalky.conversation.service.AssignService;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 会话分配设置实现。配置/参与队友均显式按 projectId 读写——
 * 既兼容设置态(项目级令牌,租户也会注入同一 projectId),也兼容分配引擎在无成员租户上下文(客户令牌)下调用。
 */
@Service
@RequiredArgsConstructor
public class AssignServiceImpl implements AssignService {

    /** 默认:轮流分配、不限会话数(对齐参考) */
    private static final int DEFAULT_MODE = 1;
    private static final int DEFAULT_MAX = 0;

    private final CnvAssignConfigMapper configMapper;
    private final CnvAssignMemberMapper memberMapper;

    @Override
    public AssignConfigVO getConfig(Long projectId) {
        CnvAssignConfig cfg = findConfig(projectId);
        if (cfg == null) {
            return new AssignConfigVO(DEFAULT_MODE, DEFAULT_MAX);
        }
        return new AssignConfigVO(cfg.getAssignMode(), cfg.getMaxConcurrent());
    }

    @Override
    public void updateConfig(Long projectId, Integer assignMode, Integer maxConcurrent) {
        int mode = assignMode == null ? DEFAULT_MODE : assignMode;
        int max = maxConcurrent == null || maxConcurrent < 0 ? DEFAULT_MAX : maxConcurrent;
        CnvAssignConfig cfg = findConfig(projectId);
        if (cfg == null) {
            cfg = new CnvAssignConfig();
            cfg.setProjectId(projectId);
            cfg.setAssignMode(mode);
            cfg.setMaxConcurrent(max);
            configMapper.insert(cfg); // id 由 insertFill 兜底注入
        } else {
            cfg.setAssignMode(mode);
            cfg.setMaxConcurrent(max);
            configMapper.updateById(cfg);
        }
    }

    @Override
    public List<Long> participantIds(Long projectId) {
        return memberMapper.selectList(Wrappers.<CnvAssignMember>lambdaQuery()
                        .eq(CnvAssignMember::getProjectId, projectId))
                .stream().map(CnvAssignMember::getMemberId).toList();
    }

    @Override
    public void addParticipant(Long projectId, Long memberId) {
        boolean exists = memberMapper.exists(Wrappers.<CnvAssignMember>lambdaQuery()
                .eq(CnvAssignMember::getProjectId, projectId)
                .eq(CnvAssignMember::getMemberId, memberId));
        if (exists) {
            return; // 幂等
        }
        CnvAssignMember m = new CnvAssignMember();
        m.setProjectId(projectId);
        m.setMemberId(memberId);
        memberMapper.insert(m);
    }

    @Override
    public void removeParticipant(Long projectId, Long memberId) {
        memberMapper.delete(Wrappers.<CnvAssignMember>lambdaQuery()
                .eq(CnvAssignMember::getProjectId, projectId)
                .eq(CnvAssignMember::getMemberId, memberId));
    }

    private CnvAssignConfig findConfig(Long projectId) {
        return configMapper.selectOne(Wrappers.<CnvAssignConfig>lambdaQuery()
                .eq(CnvAssignConfig::getProjectId, projectId).last("limit 1"));
    }
}
