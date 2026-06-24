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
import com.aitalky.common.event.MsgPushEvent;
import com.aitalky.message.event.MessagePushPublisher;
import com.aitalky.message.service.MessageService;
import com.fasterxml.jackson.databind.ObjectMapper;
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
    private final MessagePushPublisher pushPublisher;
    private final ObjectMapper objectMapper;
    private final com.aitalky.messenger.service.BlacklistService blacklistService;
    private final com.aitalky.messenger.service.MessengerConfigService messengerConfigService;
    private final com.aitalky.identity.service.MemberService memberService;
    private final com.aitalky.app.service.AssignNotifier assignNotifier;
    private final com.aitalky.conversation.service.AssignService assignService;
    private final com.aitalky.framework.storage.MinioService minioService;
    private final com.aitalky.framework.geo.GeoIpService geoIpService;

    /** 头部最多展示的坐席头像数(对齐参考:成员多时只叠 3 个) */
    private static final int AGENT_AVATAR_MAX = 3;

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
        // 信使公开配置(品牌/欢迎语/紧急通知,按客户语言);无登录上下文,Service 内显式按 projectId 查询。
        // 提前到建客户之前:据此算"生效语言",落库客户来源语言(详情/坐席侧展示用)。
        var config = messengerConfigService.getPublicConfig(project.getId(), req.lang());
        // 品牌名=项目名称(messenger 模块不依赖 identity,在此注入);LOGO 暂无项目字段
        if (config != null) {
            config = new com.aitalky.messenger.dto.MessengerPublicVO(
                    project.getName(), null, config.webTitle(), config.webIcon(), config.replyTime(),
                    config.greeting(), config.teamIntro(), config.urgentNotice(), config.urgentEnabled(),
                    config.sysMsgUnread(), config.sysMsgTyping(), config.sysMsgMemberRetract(),
                    config.popupEnabled(), config.popupAllowClose(), config.customerRetractEnabled(),
                    config.lang());
        }
        // 生效语言:URL ?lang= 指定优先,否则用信使默认语言(config.lang)。避免落库空串导致详情"语言"为空。
        String effectiveLang = StringUtils.hasText(req.lang()) ? req.lang()
                : (config == null ? req.lang() : config.lang());
        // 黑名单不拦接入:被拉黑用户仍可打开聊天框,只在发消息时拦(send 返回 CONVERSATION_BLOCKED→气泡提示)
        CusCustomer customer = customerService.resolveOrCreate(project.getId(), req.userId(), req.visitorId(), effectiveLang);
        // 专属接入:URL 带 groupId(=策略 groupKey)→ 反解专属策略id,会话只在该策略队友内分配;
        // groupId 不合法(非本项目/已删)→ 降级为普通分配(groupId=null)
        Long groupId = assignService.resolveGroupId(project.getId(), req.groupId());
        var openResult = conversationService.openOrCreate(new OpenConversationCmd(
                project.getId(), customer.getId(), groupId, req.source(), null, clientIp(request), null));
        CnvConversation conv = openResult.conversation();
        // 异步解析客户 IP 归属地回填「所在地」(不阻塞接入)。location 为空才解析(新会话/历史未解析),
        // 已有则跳过;私网/本地 IP 由 GeoIpService 内部跳过。解析成功回调按 id 写库。
        if (!StringUtils.hasText(conv.getLocation())) {
            Long convId = conv.getId();
            geoIpService.resolveAsync(conv.getIp(), loc -> conversationService.updateLocation(convId, loc));
        }
        // 注意:此处不分配、不发分配系统消息——会话此刻为「未激活」,待客户发首条消息时才激活分配(见 send)
        String token = customerTokenService.issue(project.getId(), customer.getId());
        // 服务坐席头部:已分配=显示该坐席(在线/离线);未分配=显示项目在线坐席(预计回复)或忙碌留言
        var agent = resolveAgent(project.getId(), conv.getAssigneeMemberId(),
                config == null ? null : config.replyTime());
        // 专属渠道名:会话经专属策略接入(groupId 非空)时,头部品牌名下展示渠道名;普通接入为 null
        String channelName = assignService.groupName(conv.getGroupId());
        return R.ok(new MessengerInitVO(token, conv.getId(),
                customer.getId(), customer.getName(), customer.getAvatar(), conv.getLastSeq(), config, agent,
                channelName));
    }

    /** 刷新服务坐席头部(客户令牌):坐席上下线/会话被认领后,信使端 focus/重连时拉最新 */
    @GetMapping("/agent")
    public R<com.aitalky.app.dto.MessengerAgentVO> agent(@RequestHeader("Authorization") String auth,
                                                         @RequestParam Long conversationId) {
        var principal = customerTokenService.parse(auth);
        CnvConversation conv = conversationService.getById(conversationId);
        if (!conv.getCustomerId().equals(principal.customerId()) || !conv.getProjectId().equals(principal.projectId())) {
            throw new BizException(ResultCode.FORBIDDEN);
        }
        var cfg = messengerConfigService.getPublicConfig(conv.getProjectId(), null);
        return R.ok(resolveAgent(conv.getProjectId(), conv.getAssigneeMemberId(),
                cfg == null ? null : cfg.replyTime()));
    }

    /** 计算信使头部坐席信息(4 态);assignee 被删则退回未分配逻辑 */
    private com.aitalky.app.dto.MessengerAgentVO resolveAgent(Long projectId, Long assigneeMemberId, String replyTime) {
        if (assigneeMemberId != null) {
            var a = memberService.agentOf(projectId, assigneeMemberId);
            if (a != null) {
                String mode = a.online() ? "ASSIGNED_ONLINE" : "ASSIGNED_OFFLINE";
                var item = new com.aitalky.app.dto.MessengerAgentVO.AgentItem(a.nickname(), a.avatar());
                return new com.aitalky.app.dto.MessengerAgentVO(mode, List.of(item), a.online() ? replyTime : null);
            }
        }
        // 未分配:优先展示在线坐席(预计回复),否则全部坐席头像 + 忙碌留言
        var online = memberService.agentsOf(projectId, true, AGENT_AVATAR_MAX);
        if (!online.isEmpty()) {
            return new com.aitalky.app.dto.MessengerAgentVO("POOL_ONLINE", toItems(online), replyTime);
        }
        var any = memberService.agentsOf(projectId, false, AGENT_AVATAR_MAX);
        return new com.aitalky.app.dto.MessengerAgentVO("POOL_BUSY", toItems(any), null);
    }

    private List<com.aitalky.app.dto.MessengerAgentVO.AgentItem> toItems(List<com.aitalky.identity.dto.MemberAgent> list) {
        // 池子态不展示名字(只叠头像),name 传 null
        return list.stream().map(a -> new com.aitalky.app.dto.MessengerAgentVO.AgentItem(null, a.avatar())).toList();
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
        // 黑名单拦截:被拉黑的用户/游客发消息返回会话不可用(init 时已拦,此处拦"已建会话后才被拉黑"的情况)
        if (blacklistService.isBlocked(conv.getProjectId(), customer.getExternalUserId(), customer.getVisitorId())) {
            throw new BizException(ResultCode.CONVERSATION_BLOCKED);
        }
        // 客户首条消息激活会话:未激活(打开未发)此刻才自动分配+进列表(对齐参考:发消息才分配)。
        // 先于消息落库,使「分配给X」系统消息 seq 小于客户首条消息 → 渲染在其上方,符合参考顺序。
        var activated = conversationService.activateIfDraft(conv.getId());
        if (activated != null) {
            conv = activated.conversation();                  // 用激活后的会话(status/assignee 已最新)
            assignNotifier.notifyAssigned(conv, activated.autoAssignedMemberId());
        }
        Message m = messageService.send(new SendMessageCmd(
                conv.getProjectId(), conv.getId(), customer.getId(),
                "customer", customer.getId(), customer.getName(), customer.getAvatar(),
                req.type(), req.content(), req.payload(), false, null));
        conversationService.onNewMessage(conv.getId(), m.getSeq(), preview(req.type(), req.content()), toLdt(m.getTimestamp()),
                m.getSenderAvatar(), m.getSenderName(), true, true);
        // 推送:坐席侧(assignee + 会话订阅者 + 项目频道,listener 内合并去重)+ 客户其他端
        MessageVO vo = toVO(m);
        publishPush(conv.getId(), conv.getProjectId(), conv.getAssigneeMemberId(), conv.getCustomerId(), vo);
        return R.ok(vo);
    }

    /** 客户上传文件(客户令牌):图片/文档发送前先上传拿 URL,再以富消息发送。校验令牌防止公开端点被滥用 */
    @PostMapping("/upload")
    public R<String> upload(@RequestHeader("Authorization") String auth,
                            @RequestParam("file") org.springframework.web.multipart.MultipartFile file) {
        customerTokenService.parse(auth); // 校验客户令牌(无效抛 401)
        return R.ok(minioService.upload(file));
    }

    /** 客户撤回自己的消息(客户令牌):受信使设置「客户撤回权限」开关控制 + 2分钟时限 */
    @PostMapping("/messages/{msgId}/retract")
    public R<MessageVO> retract(@RequestHeader("Authorization") String auth,
                                @RequestParam Long conversationId, @PathVariable Long msgId) {
        var principal = customerTokenService.parse(auth);
        CnvConversation conv = conversationService.getById(conversationId);
        if (!conv.getCustomerId().equals(principal.customerId()) || !conv.getProjectId().equals(principal.projectId())) {
            throw new BizException(ResultCode.FORBIDDEN);
        }
        // 客户撤回权限开关:未开启则拒绝(null 配置视为开,与下发默认一致)
        var cfg = messengerConfigService.getPublicConfig(conv.getProjectId(), null);
        if (cfg != null && !cfg.customerRetractEnabled()) {
            throw new BizException(ResultCode.RETRACT_FORBIDDEN);
        }
        Message m = messageService.retract(conversationId, msgId, "customer", principal.customerId());
        MessageVO vo = toVO(m);
        // 撤回也走消息推送管线:坐席端 + 客户其他端按 seq 替换原消息,渲染"撤回了一条消息"
        publishPush(conv.getId(), conv.getProjectId(), conv.getAssigneeMemberId(), conv.getCustomerId(), vo);
        return R.ok(vo);
    }

    /** 客户正在输入(瞬时通知,不落库):推坐席端显示"客户正在输入中" */
    @PostMapping("/typing")
    public R<Void> typing(@RequestHeader("Authorization") String auth, @RequestParam Long conversationId) {
        var principal = customerTokenService.parse(auth);
        CnvConversation conv = conversationService.getById(conversationId);
        if (!conv.getCustomerId().equals(principal.customerId()) || !conv.getProjectId().equals(principal.projectId())) {
            throw new BizException(ResultCode.FORBIDDEN);
        }
        try {
            String payload = objectMapper.writeValueAsString(java.util.Map.of(
                    "evt", "typing", "conversationId", String.valueOf(conv.getId()), "from", "customer"));
            pushPublisher.publish(new MsgPushEvent(conv.getId(), conv.getProjectId(), conv.getAssigneeMemberId(), conv.getCustomerId(), payload));
        } catch (Exception ignore) {
            // 瞬时事件,失败无需补偿
        }
        return R.ok();
    }

    /** 客户上报已读位(已读回执;信使端聊天可见时静默调,无 UI):推坐席端显示自己消息"已读" */
    @PostMapping("/read")
    public R<Void> read(@RequestHeader("Authorization") String auth,
                        @RequestParam Long conversationId, @RequestParam long seq) {
        var principal = customerTokenService.parse(auth);
        CnvConversation conv = conversationService.getById(conversationId);
        if (!conv.getCustomerId().equals(principal.customerId()) || !conv.getProjectId().equals(principal.projectId())) {
            throw new BizException(ResultCode.FORBIDDEN);
        }
        long readSeq = conversationService.markCustomerRead(conversationId, seq);
        try {
            // 已读回执只推坐席(assignee/订阅者/未分配走项目频道);customerId 传 null,不回推客户(信使端不显示)
            String payload = objectMapper.writeValueAsString(java.util.Map.of(
                    "evt", "read", "conversationId", String.valueOf(conv.getId()), "readSeq", String.valueOf(readSeq)));
            pushPublisher.publish(new MsgPushEvent(conv.getId(), conv.getProjectId(), conv.getAssigneeMemberId(), null, payload));
        } catch (Exception ignore) {
            // 瞬时事件,失败无需补偿(坐席打开会话时 detail 会带 customerReadSeq 兜底)
        }
        return R.ok();
    }

    /** 客户拉消息(客户令牌):beforeSeq 历史翻页 / afterSeq 增量;都不传取最近 50 条。客户看不到内部消息 */
    @GetMapping("/messages")
    public R<List<MessageVO>> messages(@RequestHeader("Authorization") String auth,
                                       @RequestParam Long conversationId,
                                       @RequestParam(required = false) Long afterSeq,
                                       @RequestParam(required = false) Long beforeSeq) {
        var principal = customerTokenService.parse(auth);
        CnvConversation conv = conversationService.getById(conversationId);
        if (!conv.getCustomerId().equals(principal.customerId()) || !conv.getProjectId().equals(principal.projectId())) {
            throw new BizException(ResultCode.FORBIDDEN);
        }
        List<Message> list = beforeSeq != null
                ? messageService.loadBefore(conversationId, beforeSeq, 50)
                : (afterSeq == null
                    ? messageService.loadLatest(conversationId, 50)
                    : messageService.sync(conversationId, afterSeq));
        return R.ok(list.stream()
                .filter(m -> !Boolean.TRUE.equals(m.getInternal()))   // 客户不可见内部消息
                .map(PublicMessengerController::toVO).toList());
    }

    /** 发布消息推送事件(供 ws 下发);序列化失败仅告警,不影响已落库消息 */
    private void publishPush(Long conversationId, Long projectId, Long assigneeMemberId, Long customerId, MessageVO vo) {
        try {
            String payload = objectMapper.writeValueAsString(vo);
            pushPublisher.publish(new MsgPushEvent(conversationId, projectId, assigneeMemberId, customerId, payload));
        } catch (Exception ignore) {
            // 序列化异常忽略:客户端重连可按 seq 补拉
        }
    }

    public static MessageVO toVO(Message m) {
        // 已撤回(isVisible=false):内容置空,不向任何端泄露被撤回的原文;两端按 isVisible 渲染"撤回了一条消息"
        boolean retracted = Boolean.FALSE.equals(m.getIsVisible());
        return new MessageVO(m.getMsgId(), m.getSeq(), m.getConversationId(),
                m.getSenderType(), m.getSenderId(), m.getSenderName(), m.getSenderAvatar(),
                m.getType(), retracted ? null : m.getContent(), retracted ? null : m.getPayload(),
                m.getInternal(), m.getIsVisible(), m.getTimestamp(),
                retracted ? null : m.getTranslations());
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

    private String clientIp(HttpServletRequest req) {
        // 生产经反向代理:取 X-Forwarded-For 首段=真实客户公网 IP(可正常解析归属地);
        // 本地直连无 XFF → getRemoteAddr() 常为 IPv6 回环,归一成 127.0.0.1 避免详情显示 0:0:0:0:0:0:0:1
        String xff = req.getHeader("X-Forwarded-For");
        String ip = StringUtils.hasText(xff) ? xff.split(",")[0].trim() : req.getRemoteAddr();
        if ("::1".equals(ip) || "0:0:0:0:0:0:0:1".equals(ip)) {
            return "127.0.0.1";
        }
        return ip;
    }
}
