package com.aitalky.app.service;

import com.aitalky.app.controller.PublicMessengerController;
import com.aitalky.common.event.MsgPushEvent;
import com.aitalky.conversation.entity.CnvConversation;
import com.aitalky.identity.dto.MemberBrief;
import com.aitalky.identity.service.MemberService;
import com.aitalky.message.document.Message;
import com.aitalky.message.dto.SendMessageCmd;
import com.aitalky.message.event.MessagePushPublisher;
import com.aitalky.message.service.MessageService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * 分配系统消息通知:会话被分配/认领/指派/转移给某坐席时,发一条「该会话分配给了 X」系统消息。
 * <p>仅坐席可见(internal=true,信使端 sync 过滤);只推坐席端(customerId=null 不回推客户)。
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AssignNotifier {

    private final MessageService messageService;
    private final MemberService memberService;
    private final MessagePushPublisher pushPublisher;
    private final ObjectMapper objectMapper;
    private final com.aitalky.conversation.service.ConversationService conversationService;

    /** toMemberId 为 null(未分配/进等待)不发 */
    public void notifyAssigned(CnvConversation conv, Long toMemberId) {
        if (toMemberId == null) {
            return;
        }
        MemberBrief m = memberService.brief(toMemberId);
        String nick = m == null ? "" : m.nickname();
        // senderType=system + internal=true:坐席专属系统消息;客户端不可见。
        // payload 带语义码 sysType+name,前端按坐席界面语言本地化(content 中文仅作兜底/列表预览)
        Message msg = messageService.send(new SendMessageCmd(
                conv.getProjectId(), conv.getId(), conv.getCustomerId(),
                "system", toMemberId, null, null,
                "assign", "该会话分配给了 " + nick, java.util.Map.of("sysType", "assigned", "name", nick), true, null));
        try {
            String payload = objectMapper.writeValueAsString(PublicMessengerController.toVO(msg));
            // customerId=null:不回推客户;assignee=toMemberId:推给被分配坐席(+订阅者/项目频道)
            pushPublisher.publish(new MsgPushEvent(conv.getId(), conv.getProjectId(), toMemberId, null, payload));
        } catch (Exception ignore) {
            // 序列化/推送失败忽略:坐席重连按 seq 补拉
        }
    }

    /** 保持期超时结束:发「会话超时结束」系统消息(仅坐席可见),并推进会话 lastSeq/预览;推给原负责人+项目频道 */
    public void notifyTimeoutClosed(CnvConversation conv) {
        Message msg = messageService.send(new SendMessageCmd(
                conv.getProjectId(), conv.getId(), conv.getCustomerId(),
                "system", null, null, null,
                "timeout", "会话超时结束", java.util.Map.of("sysType", "timeout"), true, null));
        // 与正常消息一致:推进 lastSeq + 列表预览显示「会话超时结束」(对齐参考列表)
        conversationService.onNewMessage(conv.getId(), msg.getSeq(), "会话超时结束",
                java.time.LocalDateTime.ofInstant(java.time.Instant.ofEpochMilli(msg.getTimestamp()), java.time.ZoneId.systemDefault()),
                null, null, false, false, "timeout"); // reopen=false:超时系统消息不能把刚结束的会话又重开;sysType=timeout 供列表预览本地化
        try {
            String payload = objectMapper.writeValueAsString(PublicMessengerController.toVO(msg));
            pushPublisher.publish(new MsgPushEvent(conv.getId(), conv.getProjectId(), conv.getAssigneeMemberId(), null, payload));
        } catch (Exception ignore) {
            // 序列化/推送失败忽略:坐席重连按 seq 补拉
        }
    }

    /** 取消分配(不分配):发「移除了会话的分配」系统消息,仅坐席可见;推项目频道(此时会话已无负责人) */
    public void notifyUnassigned(CnvConversation conv) {
        Message msg = messageService.send(new SendMessageCmd(
                conv.getProjectId(), conv.getId(), conv.getCustomerId(),
                "system", null, null, null,
                "assign", "移除了会话的分配", java.util.Map.of("sysType", "unassigned"), true, null));
        try {
            String payload = objectMapper.writeValueAsString(PublicMessengerController.toVO(msg));
            // assignee=null:推项目频道 + 会话订阅者,让坐席端实时看到;不回推客户(customerId=null)
            pushPublisher.publish(new MsgPushEvent(conv.getId(), conv.getProjectId(), null, null, payload));
        } catch (Exception ignore) {
            // 序列化/推送失败忽略:坐席重连按 seq 补拉
        }
    }
}
