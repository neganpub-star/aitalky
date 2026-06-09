package com.aitalky.app.controller;

import com.aitalky.app.dto.CustomerSendReq;
import com.aitalky.app.dto.MessengerInitReq;
import com.aitalky.app.dto.MessengerInitVO;
import com.aitalky.common.api.R;
import com.aitalky.common.api.ResultCode;
import com.aitalky.common.exception.BizException;
import com.aitalky.conversation.dto.OpenConversationCmd;
import com.aitalky.conversation.entity.CnvConversation;
import com.aitalky.conversation.service.ConversationService;
import com.aitalky.customer.entity.CusCustomer;
import com.aitalky.customer.service.CustomerService;
import com.aitalky.framework.security.CustomerTokenService;
import com.aitalky.identity.entity.IdProject;
import com.aitalky.identity.service.ProjectService;
import com.aitalky.message.document.Message;
import com.aitalky.message.dto.MessageVO;
import com.aitalky.message.dto.SendMessageCmd;
import com.aitalky.message.service.MessageService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

/**
 * 信使端(终端客户)公共接口。路径 /api/public/** 已放行坐席鉴权;此处用「客户令牌」自鉴权。
 * <p>流程:init(校验appId→建客户+会话+发令牌) → 客户用令牌发消息/拉消息。
 */
@RestController
@RequestMapping("/api/public/messenger")
@RequiredArgsConstructor
public class PublicMessengerController {

    private final ProjectService projectService;
    private final CustomerService customerService;
    private final ConversationService conversationService;
    private final MessageService messageService;
    private final CustomerTokenService customerTokenService;

    /** 初始化会话:校验 appId,解析/创建客户与会话,签发客户令牌 */
    @PostMapping("/init")
    public R<MessengerInitVO> init(@Valid @RequestBody MessengerInitReq req, HttpServletRequest request) {
        IdProject project = projectService.findByAppId(req.appId());
        if (project == null) {
            throw new BizException(ResultCode.PROJECT_NOT_FOUND);
        }
        if (!StringUtils.hasText(req.userId()) && !StringUtils.hasText(req.visitorId())) {
            throw new BizException(ResultCode.PARAM_INVALID);
        }
        CusCustomer customer = customerService.resolveOrCreate(project.getId(), req.userId(), req.visitorId(), req.lang());
        CnvConversation conv = conversationService.openOrCreate(new OpenConversationCmd(
                project.getId(), customer.getId(), null, req.source(), null, clientIp(request), null));
        String token = customerTokenService.issue(project.getId(), customer.getId());
        return R.ok(new MessengerInitVO(token, conv.getId(),
                customer.getId(), customer.getName(), customer.getAvatar(), conv.getLastSeq()));
    }

    /** 客户发送消息(客户令牌) */
    @PostMapping("/messages")
    public R<MessageVO> send(@RequestHeader("Authorization") String auth, @Valid @RequestBody CustomerSendReq req) {
        var principal = customerTokenService.parse(auth);
        CnvConversation conv = conversationService.getById(req.conversationId());
        // 绑定校验:会话必须属于该客户、该项目
        if (!conv.getCustomerId().equals(principal.customerId()) || !conv.getProjectId().equals(principal.projectId())) {
            throw new BizException(ResultCode.FORBIDDEN);
        }
        CusCustomer customer = customerService.getById(principal.customerId());
        Message m = messageService.send(new SendMessageCmd(
                conv.getProjectId(), conv.getId(), customer.getId(),
                "customer", customer.getId(), customer.getName(), customer.getAvatar(),
                req.type(), req.content(), false, null));
        conversationService.onNewMessage(conv.getId(), m.getSeq(), preview(req.content()), toLdt(m.getTimestamp()), true);
        // TODO P2: WS 推送给 assignee 全部连接 + 会话订阅者
        return R.ok(toVO(m));
    }

    /** 客户拉消息(客户令牌):afterSeq 增量;不传则取最近 50 条。客户看不到内部消息 */
    @GetMapping("/messages")
    public R<List<MessageVO>> messages(@RequestHeader("Authorization") String auth,
                                       @RequestParam Long conversationId,
                                       @RequestParam(required = false) Long afterSeq) {
        var principal = customerTokenService.parse(auth);
        CnvConversation conv = conversationService.getById(conversationId);
        if (!conv.getCustomerId().equals(principal.customerId()) || !conv.getProjectId().equals(principal.projectId())) {
            throw new BizException(ResultCode.FORBIDDEN);
        }
        List<Message> list = afterSeq == null
                ? messageService.loadLatest(conversationId, 50)
                : messageService.sync(conversationId, afterSeq);
        return R.ok(list.stream()
                .filter(m -> !Boolean.TRUE.equals(m.getInternal()))   // 客户不可见内部消息
                .map(PublicMessengerController::toVO).toList());
    }

    static MessageVO toVO(Message m) {
        return new MessageVO(m.getMsgId(), m.getSeq(), m.getConversationId(),
                m.getSenderType(), m.getSenderId(), m.getSenderName(), m.getSenderAvatar(),
                m.getType(), m.getContent(), m.getInternal(), m.getIsVisible(), m.getTimestamp());
    }

    private static LocalDateTime toLdt(Long ts) {
        return LocalDateTime.ofInstant(Instant.ofEpochMilli(ts), ZoneId.systemDefault());
    }

    private static String preview(String content) {
        return content == null ? "" : (content.length() > 50 ? content.substring(0, 50) : content);
    }

    private String clientIp(HttpServletRequest req) {
        String xff = req.getHeader("X-Forwarded-For");
        return StringUtils.hasText(xff) ? xff.split(",")[0].trim() : req.getRemoteAddr();
    }
}
