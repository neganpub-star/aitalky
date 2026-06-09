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
public class ConversationController {

    private final ConversationService conversationService;
    private final MessageService messageService;
    private final MemberService memberService;
    private final CustomerService customerService;
    private final MessagePushPublisher pushPublisher;
    private final ObjectMapper objectMapper;

    /** 收件箱列表 */
    @GetMapping
    public R<PageResult<ConversationVO>> list(ConversationListQuery query) {
        boolean canViewAll = TenantContext.hasFunction("inbox.viewAll");
        return R.ok(conversationService.list(query, TenantContext.getMemberId(), canViewAll));
    }

    /** 各视图进行中会话数(分类徽标) */
    @GetMapping("/counts")
    public R<com.aitalky.conversation.dto.ConversationCounts> counts() {
        boolean canViewAll = TenantContext.hasFunction("inbox.viewAll");
        return R.ok(conversationService.counts(TenantContext.getMemberId(), canViewAll));
    }

    /** 会话详情(含客户信息) */
    @GetMapping("/{id}")
    public R<ConversationDetailVO> detail(@PathVariable Long id) {
        CnvConversation c = conversationService.getById(id);
        CusCustomer cu = customerService.getById(c.getCustomerId());
        // 会话分配:展示坐席昵称而非 memberId(未分配为 null)
        String assigneeName = null;
        if (c.getAssigneeMemberId() != null) {
            MemberBrief m = memberService.brief(c.getAssigneeMemberId());
            assigneeName = m == null ? null : m.nickname();
        }
        return R.ok(new ConversationDetailVO(c.getId(), c.getStatus(), c.getSource(), c.getIp(), c.getLocation(),
                c.getAutoTranslate(), c.getAssigneeMemberId(), c.getLastMessageAt(),
                cu == null ? null : cu.getId(), cu == null ? null : cu.getExternalUserId(),
                cu == null ? null : cu.getName(), cu == null ? null : cu.getAvatar(),
                cu == null ? null : cu.getType(), cu == null ? null : cu.getSourceLanguage(),
                cu == null ? null : cu.getContact(), cu == null ? null : cu.getEmail(),
                cu == null ? null : cu.getCustomAttrs(), c.getLastSeq(), assigneeName));
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

    /** 坐席回复(代发归属=真实发送成员;未分配则自动认领) */
    @PostMapping("/{id}/messages")
    public R<MessageVO> reply(@PathVariable Long id, @Valid @RequestBody AgentReplyReq req) {
        CnvConversation conv = conversationService.getById(id);
        MemberBrief me = memberService.brief(TenantContext.getMemberId());
        boolean internal = Boolean.TRUE.equals(req.internal());
        Message m = messageService.send(new SendMessageCmd(
                conv.getProjectId(), id, conv.getCustomerId(),
                "agent", me.id(), me.nickname(), me.avatar(),
                req.type(), req.content(), internal, req.mentions()));
        conversationService.onNewMessage(id, m.getSeq(), preview(req.content()), toLdt(m.getTimestamp()), false);
        Long targetAssignee = conv.getAssigneeMemberId();
        if (targetAssignee == null && !internal) {
            conversationService.claim(id, me.id()); // 直接回复未分配会话即认领
            targetAssignee = me.id();
        }
        // 推送:客户(若非内部消息)+ assignee全部连接 + 会话订阅者(代看/代发由订阅天然覆盖)
        MessageVO vo = PublicMessengerController.toVO(m);
        try {
            // 内部消息不推客户;customerId 传 null 让 ws 跳过客户下发
            Long custTarget = internal ? null : conv.getCustomerId();
            pushPublisher.publish(new MsgPushEvent(id, targetAssignee, custTarget, objectMapper.writeValueAsString(vo)));
        } catch (Exception ignore) {
            // 序列化异常忽略
        }
        return R.ok(vo);
    }

    /** 认领 */
    @PostMapping("/{id}/claim")
    public R<Void> claim(@PathVariable Long id) {
        conversationService.claim(id, TenantContext.getMemberId());
        return R.ok();
    }

    /** 结束会话 */
    @PostMapping("/{id}/close")
    public R<Void> close(@PathVariable Long id) {
        conversationService.close(id);
        return R.ok();
    }

    private static LocalDateTime toLdt(Long ts) {
        return LocalDateTime.ofInstant(Instant.ofEpochMilli(ts), ZoneId.systemDefault());
    }

    private static String preview(String content) {
        return content == null ? "" : (content.length() > 50 ? content.substring(0, 50) : content);
    }
}
