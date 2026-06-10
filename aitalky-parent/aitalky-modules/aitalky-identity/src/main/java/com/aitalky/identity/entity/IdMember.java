package com.aitalky.identity.entity;

import com.aitalky.framework.mybatis.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 成员(坐席)=账号在某项目内的身份。昵称/头像由「成员管理」维护(普通成员不可自助改)。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("id_member")
public class IdMember extends BaseEntity {

    /** 项目id */
    private Long projectId;

    /** 账号id */
    private Long accountId;

    /** 角色id */
    private Long roleId;

    /** 成员昵称(单一真相) */
    private String nickname;

    /** 头像 */
    private String avatar;

    /** 状态 1启用 0禁用 */
    private Integer status;

    /** 在线状态 1在线 0离线 */
    private Integer onlineStatus;

    /** 工作状态(参与分配前提) 1可接 0离开 */
    private Integer workStatus;

    /** 个人系统语言 zh_CN/en_US */
    private String language;

    /** 消息音效 1开 0关 */
    private Integer soundEnabled;

    /** 系统推送 1开 0关 */
    private Integer pushEnabled;

    /** 推送-分配给我的会话客户消息(APP) 1开 0关 */
    private Integer pushAssignedApp;

    /** 推送-分配给我的会话客户消息(Web) 1开 0关 */
    private Integer pushAssignedWeb;

    /** 推送-未分配会话客户消息(APP) 1开 0关 */
    private Integer pushUnassignedApp;

    /** 推送-未分配会话客户消息(Web) 1开 0关 */
    private Integer pushUnassignedWeb;

    /** 推送-提到我的消息(APP) 1开 0关 */
    private Integer pushMentionApp;

    /** 推送-提到我的消息(Web) 1开 0关 */
    private Integer pushMentionWeb;

    /** 推送-新客户提醒(APP) 1开 0关 */
    private Integer pushNewCustomerApp;

    /** 推送-新客户提醒(Web) 1开 0关 */
    private Integer pushNewCustomerWeb;
}
