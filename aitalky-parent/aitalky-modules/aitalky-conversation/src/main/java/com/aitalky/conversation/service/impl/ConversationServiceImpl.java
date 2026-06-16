package com.aitalky.conversation.service.impl;

import com.aitalky.common.api.PageResult;
import com.aitalky.common.api.ResultCode;
import com.aitalky.common.exception.BizException;
import com.aitalky.common.id.SnowflakeIdGenerator;
import com.aitalky.conversation.dto.ConversationListQuery;
import com.aitalky.conversation.dto.ConversationVO;
import com.aitalky.conversation.dto.OpenConversationCmd;
import com.aitalky.conversation.entity.AsnConfig;
import com.aitalky.conversation.entity.CnvConversation;
import com.aitalky.conversation.mapper.AsnConfigMapper;
import com.aitalky.conversation.mapper.CnvConversationMapper;
import com.aitalky.conversation.service.AssignEngine;
import com.aitalky.conversation.service.ConversationService;
import com.aitalky.customer.entity.CusCustomer;
import com.aitalky.customer.mapper.CusCustomerMapper;
import com.aitalky.framework.lock.DistributedLockTemplate;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 会话服务实现。状态 0等待队列 / 1进行中 / 2已结束。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ConversationServiceImpl implements ConversationService {

    private final CnvConversationMapper conversationMapper;
    private final AsnConfigMapper asnConfigMapper;
    private final CusCustomerMapper customerMapper;
    private final SnowflakeIdGenerator idGenerator;
    private final DistributedLockTemplate lockTemplate;
    private final com.aitalky.conversation.service.AssignEngine assignEngine;

    @Override
    public com.aitalky.conversation.dto.OpenConversationResult openOrCreate(OpenConversationCmd cmd) {
        return lockTemplate.execute("lock:conv:open:" + cmd.projectId() + ":" + cmd.customerId(), 3, 10, () -> {
            // 找该客户该渠道最近一条会话(含已结束)。按渠道隔离:groupId 不同算不同会话
            // (普通分配=null 单独一类,每个专属策略各自一类),对齐参考——同一客户从普通渠道
            // 与专属渠道进会分别维护各自会话线,互不复用。
            // 关键:不限 status——已结束(含保持期自动结束)的会话也复用同一条,客户重进/刷新
            // 不会新开会话;状态此处不动,待客户真正发消息时由 onNewMessage 自动重开(status 2→1),
            // 避免"只打开窗口"就把已结束会话刷回进行中。
            CnvConversation last = conversationMapper.selectOne(Wrappers.<CnvConversation>lambdaQuery()
                    .eq(CnvConversation::getProjectId, cmd.projectId())
                    .eq(CnvConversation::getCustomerId, cmd.customerId())
                    .eq(cmd.groupId() != null, CnvConversation::getGroupId, cmd.groupId())
                    .isNull(cmd.groupId() == null, CnvConversation::getGroupId)
                    .orderByDesc(CnvConversation::getCreateTime)
                    .last("limit 1"));
            if (last != null) {
                return new com.aitalky.conversation.dto.OpenConversationResult(last, null); // 复用最近一条,不重复分配
            }
            CnvConversation conv = new CnvConversation();
            conv.setId(idGenerator.nextId());
            conv.setProjectId(cmd.projectId());
            conv.setCustomerId(cmd.customerId());
            conv.setGroupId(cmd.groupId());
            conv.setStatus(1);            // 先置进行中(未分配);引擎按规则分配或转等待队列
            conv.setSource(cmd.source());
            conv.setDeviceInfo(cmd.deviceInfo());
            conv.setIp(cmd.ip());
            conv.setLocation(cmd.location());
            conv.setAutoTranslate(0);
            conv.setUnreadCount(0);
            conv.setLastSeq(0L);
            // 关键:新会话即置 last_message_at=创建时间。列表按 last_message_at 倒序排,
            // 若留 NULL,MySQL DESC 会把新会话排到最底部(在所有有消息的会话之下)→ 坐席顶部看不到。
            conv.setLastMessageAt(LocalDateTime.now());
            conversationMapper.insert(conv);
            log.info("创建会话 conversationId={}, customerId={}", conv.getId(), cmd.customerId());
            // 自动分配(手动模式/无在线/全满 返回 null,会话留未分配或进等待队列)
            Long assigned = assignEngine.autoAssign(conv);
            return new com.aitalky.conversation.dto.OpenConversationResult(conv, assigned);
        });
    }

    @Override
    public PageResult<ConversationVO> list(ConversationListQuery q, Long memberId, boolean canViewAll) {
        // mention 视图(@提及)依赖 Mongo,后续实现,这里先返回空
        if ("mention".equals(q.getView())) {
            return PageResult.of(List.of(), 0, q.getPage(), q.getSize());
        }
        var wrapper = Wrappers.<CnvConversation>lambdaQuery()
                .eq(q.getStatus() != null, CnvConversation::getStatus, q.getStatus());
        switch (q.getView()) {
            case "unassigned" -> wrapper.isNull(CnvConversation::getAssigneeMemberId).ne(CnvConversation::getStatus, 2);
            case "all" -> {
                if (!canViewAll) {
                    throw new BizException(ResultCode.NO_FUNCTION_PERMISSION);
                }
            }
            default -> wrapper.eq(CnvConversation::getAssigneeMemberId, memberId); // mine
        }
        wrapper.orderByDesc(CnvConversation::getLastMessageAt).orderByDesc(CnvConversation::getCreateTime);

        Page<CnvConversation> page = conversationMapper.selectPage(Page.of(q.getPage(), q.getSize()), wrapper);
        Map<Long, CusCustomer> custMap = batchCustomers(page.getRecords());
        List<ConversationVO> vos = page.getRecords().stream().map(c -> {
            CusCustomer cu = custMap.get(c.getCustomerId());
            return new ConversationVO(c.getId(), c.getCustomerId(),
                    cu == null ? null : cu.getName(), cu == null ? null : cu.getAvatar(),
                    cu == null ? null : cu.getExternalUserId(),
                    c.getAssigneeMemberId(), c.getStatus(),
                    c.getLastMessagePreview(), c.getLastSenderAvatar(), c.getLastSenderName(),
                    c.getLastMessageAt(), c.getUnreadCount(), c.getLastSeq());
        }).toList();
        return PageResult.of(vos, page.getTotal(), page.getCurrent(), page.getSize());
    }

    @Override
    public PageResult<ConversationVO> search(com.aitalky.conversation.dto.ConversationSearchQuery q,
                                             List<Long> contentConvIds, Long memberId, boolean canViewAll) {
        String keyword = q.getKeyword() == null ? "" : q.getKeyword().trim();
        if (keyword.isEmpty()) {
            return PageResult.of(List.of(), 0, q.getPage(), q.getSize());
        }
        var wrapper = Wrappers.<CnvConversation>lambdaQuery();
        if ("content".equals(q.getType())) {
            // 内容搜索:命中会话ids 由上层 Mongo 预查;空命中直接返回空
            if (contentConvIds == null || contentConvIds.isEmpty()) {
                return PageResult.of(List.of(), 0, q.getPage(), q.getSize());
            }
            wrapper.in(CnvConversation::getId, contentConvIds);
        } else {
            // UID 搜索:按客户业务UID 模糊匹配(租户自动过滤本项目);无命中客户直接返回空
            List<Long> customerIds = customerMapper.selectList(Wrappers.<CusCustomer>lambdaQuery()
                            .select(CusCustomer::getId)
                            .like(CusCustomer::getExternalUserId, keyword))
                    .stream().map(CusCustomer::getId).toList();
            if (customerIds.isEmpty()) {
                return PageResult.of(List.of(), 0, q.getPage(), q.getSize());
            }
            wrapper.in(CnvConversation::getCustomerId, customerIds);
        }
        // 可见范围:看不到全部的只搜自己负责的会话(隔离)
        if (!canViewAll) {
            wrapper.eq(CnvConversation::getAssigneeMemberId, memberId);
        }
        wrapper.orderByDesc(CnvConversation::getLastMessageAt).orderByDesc(CnvConversation::getCreateTime);

        Page<CnvConversation> page = conversationMapper.selectPage(Page.of(q.getPage(), q.getSize()), wrapper);
        Map<Long, CusCustomer> custMap = batchCustomers(page.getRecords());
        List<ConversationVO> vos = page.getRecords().stream().map(c -> {
            CusCustomer cu = custMap.get(c.getCustomerId());
            return new ConversationVO(c.getId(), c.getCustomerId(),
                    cu == null ? null : cu.getName(), cu == null ? null : cu.getAvatar(),
                    cu == null ? null : cu.getExternalUserId(),
                    c.getAssigneeMemberId(), c.getStatus(),
                    c.getLastMessagePreview(), c.getLastSenderAvatar(), c.getLastSenderName(),
                    c.getLastMessageAt(), c.getUnreadCount(), c.getLastSeq());
        }).toList();
        return PageResult.of(vos, page.getTotal(), page.getCurrent(), page.getSize());
    }

    @Override
    public com.aitalky.conversation.dto.ConversationCounts counts(Long memberId, boolean canViewAll) {
        // 进行中(status=1);project_id 由多租户拦截器自动过滤
        long mine = conversationMapper.selectCount(Wrappers.<CnvConversation>lambdaQuery()
                .eq(CnvConversation::getAssigneeMemberId, memberId).eq(CnvConversation::getStatus, 1));
        long unassigned = conversationMapper.selectCount(Wrappers.<CnvConversation>lambdaQuery()
                .isNull(CnvConversation::getAssigneeMemberId).eq(CnvConversation::getStatus, 1));
        long all = canViewAll
                ? conversationMapper.selectCount(Wrappers.<CnvConversation>lambdaQuery().eq(CnvConversation::getStatus, 1))
                : 0;
        // 未读红点:仅"该我处理"的——分给我的 + 未分配的,且 unread_count>0;别人负责的不算我头上
        long mineUnread = conversationMapper.selectCount(Wrappers.<CnvConversation>lambdaQuery()
                .eq(CnvConversation::getAssigneeMemberId, memberId).eq(CnvConversation::getStatus, 1)
                .gt(CnvConversation::getUnreadCount, 0));
        long unassignedUnread = conversationMapper.selectCount(Wrappers.<CnvConversation>lambdaQuery()
                .isNull(CnvConversation::getAssigneeMemberId).eq(CnvConversation::getStatus, 1)
                .gt(CnvConversation::getUnreadCount, 0));
        return new com.aitalky.conversation.dto.ConversationCounts(mine, unassigned, all, 0, mineUnread, unassignedUnread);
    }

    @Override
    public CnvConversation getById(Long conversationId) {
        CnvConversation conv = conversationMapper.selectById(conversationId);
        if (conv == null) {
            throw new BizException(ResultCode.NOT_FOUND);
        }
        return conv;
    }

    @Override
    public void claim(Long conversationId, Long memberId) {
        CnvConversation conv = getById(conversationId);
        // 认领=分配给自己:写分配流水(applyAssign 内置 status→1)
        assignEngine.applyAssign(conv, memberId, AssignEngine.LOG_CLAIM, memberId);
    }

    @Override
    public java.util.List<com.aitalky.conversation.dto.OpenConversationResult> consumeWaitingQueue(Long projectId) {
        // 项目级锁:避免并发(多坐席同时上线/多会话同时结束)重复分配同一等待会话
        return lockTemplate.execute("lock:conv:consume:" + projectId, 2, 10,
                () -> assignEngine.consumeWaiting(projectId));
    }

    @Override
    public CnvConversation assign(Long conversationId, Long toMemberId, Long operatorMemberId) {
        CnvConversation conv = getById(conversationId);
        // 指派给他人(toMemberId 非空)/ 取消分配(toMemberId 为 null,回未分配)
        int type = toMemberId == null ? AssignEngine.LOG_TRANSFER : AssignEngine.LOG_ASSIGN;
        assignEngine.applyAssign(conv, toMemberId, type, operatorMemberId);
        return conv;
    }

    @Override
    public void close(Long conversationId) {
        CnvConversation conv = getById(conversationId);
        conv.setStatus(2);
        conv.setClosedAt(LocalDateTime.now());
        conversationMapper.updateById(conv);
    }

    @Override
    public java.util.List<CnvConversation> autoCloseIdleConversations() {
        // 无租户上下文 → 多租户拦截器整体放行,可跨项目扫描;只取开启保持期的配置
        List<AsnConfig> configs = asnConfigMapper.selectList(Wrappers.<AsnConfig>lambdaQuery()
                .gt(AsnConfig::getAutoCloseIdleMinutes, 0));
        if (configs.isEmpty()) {
            return List.of();
        }
        LocalDateTime now = LocalDateTime.now();
        java.util.List<CnvConversation> closed = new java.util.ArrayList<>();
        for (AsnConfig cfg : configs) {
            LocalDateTime cutoff = now.minusMinutes(cfg.getAutoCloseIdleMinutes());
            // 该项目下进行中(status=1)且最后活跃早于保持期阈值的会话
            List<CnvConversation> idle = conversationMapper.selectList(Wrappers.<CnvConversation>lambdaQuery()
                    .eq(CnvConversation::getProjectId, cfg.getProjectId())
                    .eq(CnvConversation::getStatus, 1)
                    .isNotNull(CnvConversation::getLastMessageAt)
                    .lt(CnvConversation::getLastMessageAt, cutoff));
            if (idle.isEmpty()) {
                continue;
            }
            for (CnvConversation conv : idle) {
                conv.setStatus(2);
                conv.setClosedAt(now);
                conversationMapper.updateById(conv);
                closed.add(conv);
            }
            log.info("保持期自动结束 projectId={}, count={}, idleMinutes={}",
                    cfg.getProjectId(), idle.size(), cfg.getAutoCloseIdleMinutes());
        }
        return closed;
    }

    @Override
    public void resetUnread(Long conversationId) {
        CnvConversation conv = conversationMapper.selectById(conversationId);
        if (conv != null && conv.getUnreadCount() != null && conv.getUnreadCount() > 0) {
            conv.setUnreadCount(0);
            conversationMapper.updateById(conv);
        }
    }

    @Override
    public long markCustomerRead(Long conversationId, long seq) {
        CnvConversation conv = conversationMapper.selectById(conversationId);
        if (conv == null) {
            return 0;
        }
        long cur = conv.getCustomerReadSeq() == null ? 0 : conv.getCustomerReadSeq();
        if (seq <= cur) {
            return cur; // 已读位只前进,不回退
        }
        conv.setCustomerReadSeq(seq);
        conversationMapper.updateById(conv);
        return seq;
    }

    @Override
    public void onNewMessage(Long conversationId, long seq, String preview, LocalDateTime time,
                             String senderAvatar, String senderName, boolean fromCustomer, boolean reopen) {
        CnvConversation conv = conversationMapper.selectById(conversationId);
        if (conv == null) {
            return;
        }
        conv.setLastSeq(seq);
        conv.setLastMessagePreview(preview);
        conv.setLastMessageAt(time);
        // 最后发送者快照(列表项小头像:谁最后回复显示谁)
        conv.setLastSenderAvatar(senderAvatar);
        conv.setLastSenderName(senderName);
        if (fromCustomer) {
            conv.setUnreadCount((conv.getUnreadCount() == null ? 0 : conv.getUnreadCount()) + 1);
        }
        // 已结束会话被真实消息(坐席或客户)激活 → 自动重开为进行中;系统消息(reopen=false)不触发
        if (reopen && conv.getStatus() != null && conv.getStatus() == 2) {
            conv.setStatus(1);
        }
        conversationMapper.updateById(conv);
    }

    private Map<Long, CusCustomer> batchCustomers(List<CnvConversation> convs) {
        List<Long> ids = convs.stream().map(CnvConversation::getCustomerId).distinct().toList();
        if (ids.isEmpty()) {
            return Map.of();
        }
        return customerMapper.selectBatchIds(ids).stream()
                .collect(Collectors.toMap(CusCustomer::getId, Function.identity(), (a, b) -> a));
    }
}
