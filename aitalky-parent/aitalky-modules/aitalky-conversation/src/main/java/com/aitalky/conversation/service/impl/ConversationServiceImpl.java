package com.aitalky.conversation.service.impl;

import com.aitalky.common.api.PageResult;
import com.aitalky.common.api.ResultCode;
import com.aitalky.common.exception.BizException;
import com.aitalky.common.id.SnowflakeIdGenerator;
import com.aitalky.conversation.dto.ConversationListQuery;
import com.aitalky.conversation.dto.ConversationVO;
import com.aitalky.conversation.dto.OpenConversationCmd;
import com.aitalky.conversation.entity.CnvConversation;
import com.aitalky.conversation.mapper.CnvConversationMapper;
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
    private final CusCustomerMapper customerMapper;
    private final SnowflakeIdGenerator idGenerator;
    private final DistributedLockTemplate lockTemplate;

    @Override
    public CnvConversation openOrCreate(OpenConversationCmd cmd) {
        return lockTemplate.execute("lock:conv:open:" + cmd.projectId() + ":" + cmd.customerId(), 3, 10, () -> {
            // 找该客户的活跃会话(进行中/等待队列)
            CnvConversation active = conversationMapper.selectOne(Wrappers.<CnvConversation>lambdaQuery()
                    .eq(CnvConversation::getProjectId, cmd.projectId())
                    .eq(CnvConversation::getCustomerId, cmd.customerId())
                    .in(CnvConversation::getStatus, 0, 1)
                    .orderByDesc(CnvConversation::getCreateTime)
                    .last("limit 1"));
            if (active != null) {
                return active;
            }
            CnvConversation conv = new CnvConversation();
            conv.setId(idGenerator.nextId());
            conv.setProjectId(cmd.projectId());
            conv.setCustomerId(cmd.customerId());
            conv.setGroupId(cmd.groupId());
            conv.setStatus(1);            // 进行中(未分配,进未分配池;分配引擎后续接入)
            conv.setSource(cmd.source());
            conv.setDeviceInfo(cmd.deviceInfo());
            conv.setIp(cmd.ip());
            conv.setLocation(cmd.location());
            conv.setAutoTranslate(0);
            conv.setUnreadCount(0);
            conv.setLastSeq(0L);
            conversationMapper.insert(conv);
            log.info("创建会话 conversationId={}, customerId={}", conv.getId(), cmd.customerId());
            return conv;
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
                    c.getAssigneeMemberId(), c.getStatus(),
                    c.getLastMessagePreview(), c.getLastMessageAt(), c.getUnreadCount(), c.getLastSeq());
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
        return new com.aitalky.conversation.dto.ConversationCounts(mine, unassigned, all, 0);
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
        conv.setAssigneeMemberId(memberId);
        if (conv.getStatus() == 0) {
            conv.setStatus(1);
        }
        conversationMapper.updateById(conv);
    }

    @Override
    public void close(Long conversationId) {
        CnvConversation conv = getById(conversationId);
        conv.setStatus(2);
        conv.setClosedAt(LocalDateTime.now());
        conversationMapper.updateById(conv);
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
    public void onNewMessage(Long conversationId, long seq, String preview, LocalDateTime time, boolean fromCustomer) {
        CnvConversation conv = conversationMapper.selectById(conversationId);
        if (conv == null) {
            return;
        }
        conv.setLastSeq(seq);
        conv.setLastMessagePreview(preview);
        conv.setLastMessageAt(time);
        if (fromCustomer) {
            conv.setUnreadCount((conv.getUnreadCount() == null ? 0 : conv.getUnreadCount()) + 1);
            if (conv.getStatus() == 2) {
                conv.setStatus(1); // 客户在已结束会话回复 → 自动重开
            }
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
