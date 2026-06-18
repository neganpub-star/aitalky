package com.aitalky.app.controller;

import com.aitalky.app.dto.AgentReplyReq;
import com.aitalky.app.dto.ConversationDetailVO;
import com.aitalky.app.dto.UpdateCustomerReq;
import com.aitalky.common.api.PageResult;
import com.aitalky.common.api.R;
import com.aitalky.conversation.dto.ConversationListQuery;
import com.aitalky.conversation.dto.ConversationVO;
import com.aitalky.conversation.entity.CnvConversation;
import com.aitalky.conversation.service.ConversationService;
import com.aitalky.customer.entity.CusCustomer;
import com.aitalky.customer.service.CustomerService;
import com.aitalky.framework.tenant.TenantContext;
import com.aitalky.framework.web.RequiresSubscription;
import com.aitalky.identity.dto.MemberBrief;
import com.aitalky.identity.service.MemberService;
import com.aitalky.message.document.Message;
import com.aitalky.message.dto.MessageVO;
import com.aitalky.message.dto.SendMessageCmd;
import com.aitalky.common.event.MsgPushEvent;
import com.aitalky.message.event.MessagePushPublisher;
import com.aitalky.message.service.MessageService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

/**
 * 坐席端会话接口(项目级令牌)。收件箱列表/详情/消息/回复/认领/结束。
 * <p>会话可见性由 view + 权限控制:all 视图需 inbox.viewAll;否则只看分给自己的(mine)。
 */
@RestController
@RequestMapping("/api/conversations")
@RequiredArgsConstructor
@RequiresSubscription  // 工作台功能:项目无有效订阅则整体拦截,引导前往订阅
public class ConversationController {

    private final ConversationService conversationService;
    private final MessageService messageService;
    private final MemberService memberService;
    private final CustomerService customerService;
    private final MessagePushPublisher pushPublisher;
    private final ObjectMapper objectMapper;
    private final com.aitalky.messenger.service.BlacklistService blacklistService;
    private final com.aitalky.app.service.AssignNotifier assignNotifier;
    private final com.aitalky.conversation.service.AssignService assignService;
    private final org.redisson.api.RedissonClient redisson; // 查客户 WS 在线状态(ws:conn:cust:{id})

    /** 收件箱列表 */
    @GetMapping
    public R<PageResult<ConversationVO>> list(ConversationListQuery query) {
        boolean canViewAll = TenantContext.hasFunction("inbox.viewAll");
        Long me = TenantContext.getMemberId();
        // mention 视图:先查「@我」会话ids 传入(其它视图传 null)
        java.util.List<Long> mentionIds = "mention".equals(query.getView())
                ? messageService.mentionedConversationIds(TenantContext.getProjectId(), me, 500) : null;
        return R.ok(conversationService.list(query, me, canViewAll, mentionIds));
    }

    /** 各视图进行中会话数(分类徽标) */
    @GetMapping("/counts")
    public R<com.aitalky.conversation.dto.ConversationCounts> counts() {
        boolean canViewAll = TenantContext.hasFunction("inbox.viewAll");
        Long me = TenantContext.getMemberId();
        java.util.List<Long> mentionIds = messageService.mentionedConversationIds(TenantContext.getProjectId(), me, 500);
        return R.ok(conversationService.counts(me, canViewAll, mentionIds));
    }

    /** 会话搜索:type=uid 按客户业务UID;type=content 按消息内容(Mongo)。需 inbox.search */
    @GetMapping("/search")
    @com.aitalky.framework.web.RequiresFunction("inbox.search")
    public R<PageResult<ConversationVO>> search(com.aitalky.conversation.dto.ConversationSearchQuery query) {
        boolean canViewAll = TenantContext.hasFunction("inbox.viewAll");
        Long memberId = TenantContext.getMemberId();
        // 内容搜索先用 Mongo 命中会话ids(本项目、可见、非内部),再交会话模块按可见范围分页
        List<Long> contentConvIds = "content".equals(query.getType())
                ? messageService.searchConversationIds(TenantContext.getProjectId(), query.getKeyword(), 500)
                : null;
        return R.ok(conversationService.search(query, contentConvIds, memberId, canViewAll));
    }

    /** 会话详情(含客户信息) */
    @GetMapping("/{id}")
    public R<ConversationDetailVO> detail(@PathVariable Long id) {
        CnvConversation c = conversationService.getById(id);
        CusCustomer cu = customerService.getById(c.getCustomerId());
        // 会话分配:展示坐席昵称+头像而非 memberId(未分配为 null)
        String assigneeName = null;
        String assigneeAvatar = null;
        if (c.getAssigneeMemberId() != null) {
            MemberBrief m = memberService.brief(c.getAssigneeMemberId());
            assigneeName = m == null ? null : m.nickname();
            assigneeAvatar = m == null ? null : m.avatar();
        }
        // 黑名单状态:命中记录 id(无则 null),供详情面板「加入/移除黑名单」切换
        Long blacklistId = cu == null ? null
                : blacklistService.findBlockedId(c.getProjectId(), cu.getExternalUserId(), cu.getVisitorId());
        // 来源渠道:会话带 groupId=专属分配,取专属策略名作渠道名称;无 groupId=普通分配(channelName=null)
        String channelName = assignService.groupName(c.getGroupId());
        // 客户在线:WS 连接集合 ws:conn:cust:{customerId} 非空(与 ws ConnectionRegistry 同一约定)
        boolean customerOnline = c.getCustomerId() != null
                && !redisson.getSet("ws:conn:cust:" + c.getCustomerId()).isEmpty();
        return R.ok(new ConversationDetailVO(c.getId(), c.getStatus(), c.getSource(), c.getIp(), c.getLocation(),
                c.getAutoTranslate(), c.getAssigneeMemberId(), c.getLastMessageAt(),
                cu == null ? null : cu.getId(), cu == null ? null : cu.getExternalUserId(),
                cu == null ? null : cu.getName(), cu == null ? null : cu.getAvatar(),
                cu == null ? null : cu.getType(), cu == null ? null : cu.getSourceLanguage(),
                cu == null ? null : cu.getContact(), cu == null ? null : cu.getEmail(),
                cu == null ? null : cu.getCustomAttrs(), c.getLastSeq(), assigneeName, assigneeAvatar,
                c.getCustomerReadSeq(),
                blacklistId != null, blacklistId,
                c.getGroupId(), channelName, customerOnline));
    }

    /** 更新客户联系方式/邮箱(详情面板编辑) */
    @PutMapping("/{id}/customer")
    public R<Void> updateCustomer(@PathVariable Long id, @RequestBody UpdateCustomerReq req) {
        CnvConversation c = conversationService.getById(id);
        customerService.updateContact(c.getCustomerId(), c.getProjectId(), req.contact(), req.email());
        return R.ok();
    }

    /** 会话消息(afterSeq 增量;不传取最近 50 条);打开即清未读。坐席可见内部消息 */
    @GetMapping("/{id}/messages")
    public R<List<MessageVO>> messages(@PathVariable Long id, @RequestParam(required = false) Long afterSeq) {
        conversationService.getById(id);
        conversationService.resetUnread(id);
        List<Message> list = afterSeq == null
                ? messageService.loadLatest(id, 50)
                : messageService.sync(id, afterSeq);
        return R.ok(list.stream().map(PublicMessengerController::toVO).toList());
    }

    /** 坐席回复(代发归属=真实发送成员;未分配 / 已结束被重新发起 则分配给当前坐席) */
    @PostMapping("/{id}/messages")
    public R<MessageVO> reply(@PathVariable Long id, @Valid @RequestBody AgentReplyReq req) {
        CnvConversation conv = conversationService.getById(id);
        boolean wasClosed = conv.getStatus() != null && conv.getStatus() == 2; // 取消息前状态:已结束坐席重发→重开+归属当前坐席
        MemberBrief me = memberService.brief(TenantContext.getMemberId());
        boolean internal = Boolean.TRUE.equals(req.internal());
        Message m = messageService.send(new SendMessageCmd(
                conv.getProjectId(), id, conv.getCustomerId(),
                "agent", me.id(), me.nickname(), me.avatar(),
                req.type(), req.content(), req.payload(), internal, req.mentions()));
        conversationService.onNewMessage(id, m.getSeq(), preview(req.type(), req.content()), toLdt(m.getTimestamp()),
                m.getSenderAvatar(), m.getSenderName(), false, true);
        Long targetAssignee = conv.getAssigneeMemberId();
        // 未分配 → 自动认领;已结束被坐席重新发起 → 重新分配给该坐席并发系统消息(即便原属他人/原属自己,
        // 语义=重新聊天即一次重新分配)。内部消息不触发。
        boolean needAssign = !internal && (targetAssignee == null || wasClosed);
        if (needAssign) {
            conversationService.claim(id, me.id());
            targetAssignee = me.id();
            assignNotifier.notifyAssigned(conv, me.id()); // 「该会话分配给了X」系统消息
        }
        // 推送:客户(若非内部消息)+ assignee全部连接 + 会话订阅者(代看/代发由订阅天然覆盖)
        MessageVO vo = PublicMessengerController.toVO(m);
        try {
            // 内部消息不推客户;customerId 传 null 让 ws 跳过客户下发
            Long custTarget = internal ? null : conv.getCustomerId();
            pushPublisher.publish(new MsgPushEvent(id, conv.getProjectId(), targetAssignee, custTarget, objectMapper.writeValueAsString(vo)));
        } catch (Exception ignore) {
            // 序列化异常忽略
        }
        return R.ok(vo);
    }

    /** 坐席撤回自己发送的消息(2分钟时限);撤回后两端按 seq 替换原消息渲染"撤回了一条消息" */
    @PostMapping("/{id}/messages/{msgId}/retract")
    public R<MessageVO> retract(@PathVariable Long id, @PathVariable Long msgId) {
        CnvConversation conv = conversationService.getById(id);
        Message m = messageService.retract(id, msgId, "agent", TenantContext.getMemberId());
        MessageVO vo = PublicMessengerController.toVO(m);
        try {
            // 内部消息撤回不推客户(customerId 传 null);普通消息推客户其他端
            Long custTarget = Boolean.TRUE.equals(m.getInternal()) ? null : conv.getCustomerId();
            pushPublisher.publish(new MsgPushEvent(id, conv.getProjectId(), conv.getAssigneeMemberId(), custTarget, objectMapper.writeValueAsString(vo)));
        } catch (Exception ignore) {
            // 序列化异常忽略:客户端重连按 seq 补拉即得撤回态
        }
        return R.ok(vo);
    }

    /** 坐席正在输入(瞬时通知,不落库):推客户端显示"对方正在输入中" */
    @PostMapping("/{id}/typing")
    public R<Void> typing(@PathVariable Long id) {
        CnvConversation conv = conversationService.getById(id);
        publishTyping(conv, "agent");
        return R.ok();
    }

    /** 发布 typing 瞬时事件(evt=typing + from);两端按 from 只响应对方来源,自己回声忽略 */
    private void publishTyping(CnvConversation conv, String from) {
        try {
            String payload = objectMapper.writeValueAsString(java.util.Map.of(
                    "evt", "typing", "conversationId", String.valueOf(conv.getId()), "from", from));
            pushPublisher.publish(new MsgPushEvent(conv.getId(), conv.getProjectId(), conv.getAssigneeMemberId(), conv.getCustomerId(), payload));
        } catch (Exception ignore) {
            // 瞬时事件,失败无需补偿
        }
    }

    /** 认领 */
    @PostMapping("/{id}/claim")
    public R<Void> claim(@PathVariable Long id) {
        Long me = TenantContext.getMemberId();
        conversationService.claim(id, me);
        assignNotifier.notifyAssigned(conversationService.getById(id), me);
        return R.ok();
    }

    /** 指派会话:memberId 指派给该队友;不传/为空=取消分配(回未分配)。所有坐席可操作 */
    @PostMapping("/{id}/assign")
    public R<Void> assign(@PathVariable Long id, @RequestBody AssignReq req) {
        CnvConversation conv = conversationService.assign(id, req.memberId(), TenantContext.getMemberId());
        // 指派给队友→「分配给了X」;不分配(null)→「移除了会话的分配」并回未分配
        if (req.memberId() == null) {
            assignNotifier.notifyUnassigned(conv);
        } else {
            assignNotifier.notifyAssigned(conv, req.memberId());
        }
        return R.ok();
    }

    public record AssignReq(Long memberId) {
    }

    /** 结束会话(释放该坐席容量 → 消费等待队列,把等待会话分给空出的坐席) */
    @PostMapping("/{id}/close")
    public R<Void> close(@PathVariable Long id) {
        CnvConversation conv = conversationService.getById(id);
        conversationService.close(id);
        conversationService.consumeWaitingQueue(conv.getProjectId())
                .forEach(r -> assignNotifier.notifyAssigned(r.conversation(), r.autoAssignedMemberId()));
        return R.ok();
    }

    private static LocalDateTime toLdt(Long ts) {
        return LocalDateTime.ofInstant(Instant.ofEpochMilli(ts), ZoneId.systemDefault());
    }

    private static String preview(String content) {
        return content == null ? "" : (content.length() > 50 ? content.substring(0, 50) : content);
    }

    /** 列表预览:图片/视频/文件等富消息不展示原始 URL,显示占位文案 */
    private static String preview(String type, String content) {
        return switch (type == null ? "" : type) {
            case "image" -> "[图片]";
            case "video" -> "[视频]";
            case "file" -> "[文件]";
            default -> preview(content);
        };
    }
}
