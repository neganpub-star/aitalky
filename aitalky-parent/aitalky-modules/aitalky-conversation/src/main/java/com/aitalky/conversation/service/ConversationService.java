package com.aitalky.conversation.service;

import com.aitalky.common.api.PageResult;
import com.aitalky.conversation.dto.ConversationListQuery;
import com.aitalky.conversation.dto.ConversationVO;
import com.aitalky.conversation.entity.CnvConversation;

import java.time.LocalDateTime;

/** 会话服务 */
public interface ConversationService {

    /** 建或取该客户的活跃会话(进行中/等待队列);已结束则新建。新建会话经引擎自动分配,结果含分配到的坐席 */
    com.aitalky.conversation.dto.OpenConversationResult openOrCreate(com.aitalky.conversation.dto.OpenConversationCmd cmd);

    /**
     * 收件箱列表(view: mine/unassigned/all/mention)。
     * @param mentionConvIds view=mention 时由上层(MessageService)预查的"@我"会话ids;其它视图忽略
     */
    PageResult<ConversationVO> list(ConversationListQuery query, Long memberId, boolean canViewAll,
                                    java.util.List<Long> mentionConvIds);

    /**
     * 会话搜索:type=uid 按客户业务UID(本模块查 cus_customer);type=content 用上层 Mongo 命中的会话ids。
     * 可见范围:canViewAll=全项目,否则仅自己负责的会话。
     *
     * @param contentConvIds type=content 时由上层(MessageService)预查的命中会话ids;type=uid 时忽略
     */
    PageResult<ConversationVO> search(com.aitalky.conversation.dto.ConversationSearchQuery query,
                                      java.util.List<Long> contentConvIds, Long memberId, boolean canViewAll);

    /** 各视图进行中会话数(分类徽标)。mentionConvIds=「@我」会话ids(上层预查),用于 mention 计数 */
    com.aitalky.conversation.dto.ConversationCounts counts(Long memberId, boolean canViewAll,
                                                           java.util.List<Long> mentionConvIds);

    /** 取会话 */
    CnvConversation getById(Long conversationId);

    /** 认领(分配给自己) */
    void claim(Long conversationId, Long memberId);

    /** 指派给他人(toMemberId 非空)或取消分配(toMemberId 为 null,回未分配);operatorMemberId=操作人。返回会话 */
    CnvConversation assign(Long conversationId, Long toMemberId, Long operatorMemberId);

    /** 消费等待队列(结束会话释放容量 / 坐席上线后调用)。返回本次新分配的会话+坐席,供发分配系统消息 */
    java.util.List<com.aitalky.conversation.dto.OpenConversationResult> consumeWaitingQueue(Long projectId);

    /** 结束会话 */
    void close(Long conversationId);

    /**
     * 保持期自动结束:扫描所有开启保持期(asn_config.auto_close_idle_minutes>0)的项目,
     * 把空闲(last_message_at 早于保持期)且进行中的会话置为已结束。
     * <p>由定时任务调用,无租户上下文(跨项目扫描)。
     * @return 本次被结束的会话(供上层逐条发「会话超时结束」系统消息、并按项目消费等待队列)
     */
    java.util.List<CnvConversation> autoCloseIdleConversations();

    /** 清零坐席侧未读(打开会话时) */
    void resetUnread(Long conversationId);

    /**
     * 回填会话「所在地」(IP 异步解析归属地后调用)。仅按 id 更新 location,空值不更新。
     * <p>常在无租户上下文的异步线程调用——多租户拦截器在上下文无 projectId 时整体忽略,
     * 故按 id 更新可正常生效,无需透传 TenantContext。
     */
    void updateLocation(Long conversationId, String location);

    /**
     * 新消息落地后更新会话冗余字段(列表展示用)。
     *
     * @param senderAvatar 发送者头像快照(列表项小头像:谁最后回复显示谁)
     * @param senderName   发送者昵称快照(头像缺省时兜底)
     * @param fromCustomer 是否客户发来(是则坐席侧未读+1)
     * @param reopen       是否在会话已结束时自动重开(进行中)。真实消息(坐席/客户)传 true;
     *                     系统消息(如超时结束自身)传 false,避免刚结束又被自己的系统消息重开。
     */
    void onNewMessage(Long conversationId, long seq, String preview, LocalDateTime time,
                      String senderAvatar, String senderName, boolean fromCustomer, boolean reopen);

    /**
     * 客户上报已读位:customer_read_seq 单调前进(取 max)。
     * @return 更新后的已读 seq(已是更大值则原样返回);供上层推已读回执给坐席
     */
    long markCustomerRead(Long conversationId, long seq);
}
