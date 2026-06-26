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
 * 会话服务实现。状态 0等待队列 / 1进行中 / 2已结束 / 3未激活(客户已打开窗口但未发消息,不进列表/不分配)。
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
            // 对齐参考:客户只是"打开窗口"不立即分配/进列表,先置「未激活」(status=3);
            // 待客户发出首条消息时由 activateIfDraft 激活(此刻才自动分配、推进轮询游标、进列表)。
            conv.setStatus(3);
            conv.setSource(cmd.source());
            conv.setDeviceInfo(cmd.deviceInfo());
            conv.setIp(cmd.ip());
            conv.setLocation(cmd.location());
            conv.setAutoTranslate(0);
            conv.setUnreadCount(0);
            conv.setLastSeq(0L);
            // last_message_at=创建时间(排序兜底);未激活会话不进列表,激活后由首条消息刷新该值。
            conv.setLastMessageAt(LocalDateTime.now());
            conversationMapper.insert(conv);
            log.info("创建会话(未激活) conversationId={}, customerId={}", conv.getId(), cmd.customerId());
            // 此处不分配:分配延迟到客户首条消息(见 activateIfDraft),避免"只打开不发消息"占用轮询名额/坐席列表
            return new com.aitalky.conversation.dto.OpenConversationResult(conv, null);
        });
    }

    @Override
    public com.aitalky.conversation.dto.OpenConversationResult activateIfDraft(Long conversationId) {
        // 加锁防客户连发并发重复激活/重复分配;同一会话激活串行
        return lockTemplate.execute("lock:conv:activate:" + conversationId, 3, 10, () -> {
            CnvConversation conv = conversationMapper.selectById(conversationId);
            if (conv == null || conv.getStatus() == null || conv.getStatus() != 3) {
                return null; // 不存在或已激活(非未激活态):无需处理
            }
            // 此刻才自动分配(轮询游标在此推进);分配成功 applyAssign 内置 status=1+assignee,
            // 全满则置 status=0 进等待队列,手动模式/无在线则不改(仍为3)
            Long assigned = assignEngine.autoAssign(conv);
            // 激活语义=客户已发消息就该进列表:除"进等待队列(0)"外,未被分配改动的(仍3)一律置进行中(未分配)
            if (conv.getStatus() != null && conv.getStatus() == 3) {
                conv.setStatus(1);
                conversationMapper.updateById(conv);
            }
            log.info("会话激活 conversationId={}, assigned={}, status={}", conversationId, assigned, conv.getStatus());
            return new com.aitalky.conversation.dto.OpenConversationResult(conv, assigned);
        });
    }

    @Override
    public PageResult<ConversationVO> list(ConversationListQuery q, Long memberId, boolean canViewAll,
                                           List<Long> mentionConvIds) {
        var wrapper = Wrappers.<CnvConversation>lambdaQuery()
                .eq(q.getStatus() != null, CnvConversation::getStatus, q.getStatus());
        switch (q.getView()) {
            case "mention" -> {
                // @提及我的:上层 Mongo 预查的会话ids;空命中直接返回空(避免 in() 空集合查全表)
                if (mentionConvIds == null || mentionConvIds.isEmpty()) {
                    return PageResult.of(List.of(), 0, q.getPage(), q.getSize());
                }
                wrapper.in(CnvConversation::getId, mentionConvIds);
            }
            // 未分配池=等待队列(0)+未分配进行中(1);排除已结束(2)与未激活(3,客户打开未发消息不入列表)
            case "unassigned" -> wrapper.isNull(CnvConversation::getAssigneeMemberId).in(CnvConversation::getStatus, 0, 1);
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
                    c.getLastMessagePreview(), c.getLastSysType(), c.getLastSenderAvatar(), c.getLastSenderName(),
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
                    c.getLastMessagePreview(), c.getLastSysType(), c.getLastSenderAvatar(), c.getLastSenderName(),
                    c.getLastMessageAt(), c.getUnreadCount(), c.getLastSeq());
        }).toList();
        return PageResult.of(vos, page.getTotal(), page.getCurrent(), page.getSize());
    }

    @Override
    public com.aitalky.conversation.dto.ConversationCounts counts(Long memberId, boolean canViewAll,
                                                                  List<Long> mentionConvIds) {
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
        // @提及我的:进行中且在「@我」会话集合内的数量
        long mention = (mentionConvIds == null || mentionConvIds.isEmpty()) ? 0
                : conversationMapper.selectCount(Wrappers.<CnvConversation>lambdaQuery()
                        .in(CnvConversation::getId, mentionConvIds).eq(CnvConversation::getStatus, 1));
        return new com.aitalky.conversation.dto.ConversationCounts(mine, unassigned, all, mention, mineUnread, unassignedUnread);
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
        // 认领=分配给自己;条件更新(assignee IS NULL)防并发双认领,失败抛 CONVERSATION_ALREADY_CLAIMED
        assignEngine.claim(conv, memberId);
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
    public long markAgentRead(Long conversationId) {
        CnvConversation conv = conversationMapper.selectById(conversationId);
        if (conv == null) {
            return -1;
        }
        long lastSeq = java.util.Optional.ofNullable(conv.getLastSeq()).orElse(0L);
        long cur = java.util.Optional.ofNullable(conv.getAgentReadSeq()).orElse(0L);
        if (lastSeq <= cur) {
            return -1; // 已是最新,无需推进/通知
        }
        // 只更新该字段,避免覆盖并发改动的其它列
        CnvConversation upd = new CnvConversation();
        upd.setId(conversationId);
        upd.setAgentReadSeq(lastSeq);
        conversationMapper.updateById(upd);
        return lastSeq;
    }

    @Override
    public void updateTranslateSetting(Long conversationId, Integer autoTranslate, String translateTo, Integer agentAutoTranslate) {
        var update = Wrappers.<CnvConversation>lambdaUpdate().eq(CnvConversation::getId, conversationId);
        if (autoTranslate != null) {
            update.set(CnvConversation::getAutoTranslate, autoTranslate);
        }
        if (translateTo != null) {
            update.set(CnvConversation::getTranslateTo, translateTo);
        }
        if (agentAutoTranslate != null) {
            update.set(CnvConversation::getAgentAutoTranslate, agentAutoTranslate);
        }
        conversationMapper.update(null, update);
    }

    @Override
    public void updateLocation(Long conversationId, String location) {
        if (conversationId == null || !org.springframework.util.StringUtils.hasText(location)) {
            return;
        }
        // 仅按 id set location:用 update wrapper 不带实体,避免覆盖其他字段;
        // 异步线程无租户上下文,多租户拦截器整体忽略 → 按 id 更新正常生效
        conversationMapper.update(null, Wrappers.<CnvConversation>lambdaUpdate()
                .eq(CnvConversation::getId, conversationId)
                .set(CnvConversation::getLocation, location));
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
                             String senderAvatar, String senderName, boolean fromCustomer, boolean reopen, String sysType) {
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
        // last_sys_type 显式写(普通消息传 null,需覆盖上一条系统消息的语义码;updateById 默认不更新 null,故单独 set)
        conversationMapper.update(null, Wrappers.<CnvConversation>lambdaUpdate()
                .eq(CnvConversation::getId, conversationId)
                .set(CnvConversation::getLastSysType, sysType));
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
