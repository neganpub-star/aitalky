package com.aitalky.conversation.service;

import com.aitalky.conversation.dto.AssignConfigVO;
import com.aitalky.conversation.entity.CnvAssignLog;
import com.aitalky.conversation.entity.CnvConversation;
import com.aitalky.conversation.mapper.CnvAssignLogMapper;
import com.aitalky.conversation.mapper.CnvConversationMapper;
import com.aitalky.identity.service.MemberService;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 会话分配引擎(普通分配模式)。资格 = 参与队友 ∩ 工作状态在线 ∩ 进行中会话数<上限。
 * 轮流=游标顺序;负载=进行中最少。无在线→留未分配(status=1);全满→等待队列(status=0)。
 * <p>注:可能在客户令牌(新建会话)下被调用,查在线成员走 MemberService(已绕租户)。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AssignEngine {

    private final CnvConversationMapper conversationMapper;
    private final CnvAssignLogMapper assignLogMapper;
    private final AssignService assignService;
    private final MemberService memberService;

    /** 分配类型:1认领 2指派 3自动 4转移 */
    public static final int LOG_AUTO = 3;

    /**
     * 为会话自动分配坐席并落库(更新 assignee/status)。
     * @return 被分配的 memberId;手动模式/无参与/无在线/进等待 返回 null(不发分配系统消息)
     */
    public Long autoAssign(CnvConversation conv) {
        AssignConfigVO cfg = assignService.getConfig(conv.getProjectId());
        int mode = cfg.assignMode() == null ? 1 : cfg.assignMode();
        if (mode == 0) {
            return null; // 手动:留未分配,待坐席认领/指派
        }
        // 参与范围:P1 普通分配名单;P2 将按 conv.groupId 切到专属策略队友
        List<Long> scope = assignService.participantIds(conv.getProjectId());
        if (scope.isEmpty()) {
            return null;
        }
        Set<Long> online = new HashSet<>(memberService.onlineMemberIds(conv.getProjectId()));
        List<Long> onlineScope = scope.stream().filter(online::contains).sorted().toList();
        if (onlineScope.isEmpty()) {
            return null; // 无在线坐席:留未分配(在线是参与自动分配的前提)
        }
        int max = cfg.maxConcurrent() == null ? 0 : cfg.maxConcurrent();
        Map<Long, Integer> counts = inProgressCounts(conv.getProjectId(), onlineScope);
        List<Long> eligible = max <= 0
                ? onlineScope
                : onlineScope.stream().filter(id -> counts.getOrDefault(id, 0) < max).toList();
        if (eligible.isEmpty()) {
            // 在线但全部满载 → 等待队列
            conv.setStatus(0);
            conversationMapper.updateById(conv);
            log.info("会话进等待队列 conversationId={}, projectId={}", conv.getId(), conv.getProjectId());
            return null;
        }
        Long target = mode == 2
                ? pickLeastLoaded(eligible, counts)
                : assignService.nextRoundRobin(conv.getProjectId(), eligible);
        applyAssign(conv, target, LOG_AUTO, null);
        return target;
    }

    /** 落库分配结果:更新会话 + 写分配流水。type:1认领 2指派 3自动 4转移 */
    public void applyAssign(CnvConversation conv, Long toMemberId, int type, Long operatorMemberId) {
        Long from = conv.getAssigneeMemberId();
        conv.setAssigneeMemberId(toMemberId);
        conv.setStatus(toMemberId == null ? conv.getStatus() : 1);
        conversationMapper.updateById(conv);
        CnvAssignLog log = new CnvAssignLog();
        log.setProjectId(conv.getProjectId());
        log.setConversationId(conv.getId());
        log.setFromMemberId(from);
        log.setToMemberId(toMemberId);
        log.setType(type);
        log.setOperatorMemberId(operatorMemberId);
        assignLogMapper.insert(log);
    }

    /** 进行中会话数(status=1)按 assignee 统计;显式 projectId 兼容无租户上下文 */
    private Map<Long, Integer> inProgressCounts(Long projectId, List<Long> memberIds) {
        if (memberIds.isEmpty()) {
            return Map.of();
        }
        return conversationMapper.selectList(Wrappers.<CnvConversation>lambdaQuery()
                        .select(CnvConversation::getAssigneeMemberId)
                        .eq(CnvConversation::getProjectId, projectId)
                        .eq(CnvConversation::getStatus, 1)
                        .in(CnvConversation::getAssigneeMemberId, memberIds))
                .stream()
                .collect(Collectors.groupingBy(CnvConversation::getAssigneeMemberId,
                        Collectors.summingInt(c -> 1)));
    }

    /** 负载:进行中最少者(并列取最小 id,候选已升序) */
    private Long pickLeastLoaded(List<Long> candidates, Map<Long, Integer> counts) {
        return candidates.stream()
                .min((a, b) -> {
                    int ca = counts.getOrDefault(a, 0);
                    int cb = counts.getOrDefault(b, 0);
                    return ca != cb ? Integer.compare(ca, cb) : Long.compare(a, b);
                })
                .orElse(candidates.get(0));
    }
}
