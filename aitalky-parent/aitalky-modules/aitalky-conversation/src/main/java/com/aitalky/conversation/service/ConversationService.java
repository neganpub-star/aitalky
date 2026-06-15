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

    /** 收件箱列表(view: mine/unassigned/all/mention) */
    PageResult<ConversationVO> list(ConversationListQuery query, Long memberId, boolean canViewAll);

    /**
     * 会话搜索:type=uid 按客户业务UID(本模块查 cus_customer);type=content 用上层 Mongo 命中的会话ids。
     * 可见范围:canViewAll=全项目,否则仅自己负责的会话。
     *
     * @param contentConvIds type=content 时由上层(MessageService)预查的命中会话ids;type=uid 时忽略
     */
    PageResult<ConversationVO> search(com.aitalky.conversation.dto.ConversationSearchQuery query,
                                      java.util.List<Long> contentConvIds, Long memberId, boolean canViewAll);

    /** 各视图进行中会话数(分类徽标) */
    com.aitalky.conversation.dto.ConversationCounts counts(Long memberId, boolean canViewAll);

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

    /** 清零坐席侧未读(打开会话时) */
    void resetUnread(Long conversationId);

    /**
     * 新消息落地后更新会话冗余字段(列表展示用)。
     *
     * @param fromCustomer 是否客户发来(是则坐席侧未读+1)
     */
    void onNewMessage(Long conversationId, long seq, String preview, LocalDateTime time, boolean fromCustomer);

    /**
     * 客户上报已读位:customer_read_seq 单调前进(取 max)。
     * @return 更新后的已读 seq(已是更大值则原样返回);供上层推已读回执给坐席
     */
    long markCustomerRead(Long conversationId, long seq);
}
