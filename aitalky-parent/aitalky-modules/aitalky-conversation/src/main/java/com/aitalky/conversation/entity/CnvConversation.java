package com.aitalky.conversation.entity;

import com.aitalky.framework.mybatis.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

/**
 * 会话。状态 0等待队列 / 1进行中 / 2已结束;assignee 空=未分配。
 * 列表展示走 MySQL(last_message_* / unread_count);消息明细在 Mongo。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("cnv_conversation")
public class CnvConversation extends BaseEntity {

    private Long projectId;
    /** 客户id */
    private Long customerId;
    /** 客服组id */
    private Long groupId;
    /** 负责坐席成员id(空=未分配) */
    private Long assigneeMemberId;
    /** 状态 0等待队列 1进行中 2已结束 */
    private Integer status;
    /** 来源 pc/app */
    private String source;
    /** 设备/来源信息 */
    private String deviceInfo;
    /** 客户IP */
    private String ip;
    /** 客户所在地 */
    private String location;
    /** 是否开启自动翻译 */
    private Integer autoTranslate;
    /** 坐席侧未读数 */
    private Integer unreadCount;
    /** 会话内已分配最大消息序号 */
    private Long lastSeq;
    /** 客户已读到的 seq(已读回执:坐席消息 seq<=此值即"已读") */
    private Long customerReadSeq;
    /** 最后一条消息预览 */
    private String lastMessagePreview;
    /** 最后一条消息发送者头像快照(列表项小头像:谁最后回复显示谁) */
    private String lastSenderAvatar;
    /** 最后一条消息发送者昵称快照(头像缺省时取首字母兜底) */
    private String lastSenderName;
    /** 最后消息时间 */
    private LocalDateTime lastMessageAt;
    /** 结束时间 */
    private LocalDateTime closedAt;
}
