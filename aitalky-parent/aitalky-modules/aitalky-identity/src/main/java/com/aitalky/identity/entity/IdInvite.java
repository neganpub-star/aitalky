package com.aitalky.identity.entity;

import com.aitalky.framework.mybatis.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

/**
 * 邮箱邀请(一邮箱一条)。
 * <p>状态机:0待接受 →(接受)1已接受 /(撤销)2已撤销 /(超时)3已过期。
 * <p>"再次邀请"复用同一条记录:重置 token/过期时间、send_count 累加、状态回到待接受。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("id_invite")
public class IdInvite extends BaseEntity {

    /** 项目id */
    private Long projectId;

    /** 被邀请邮箱 */
    private String email;

    /** 邀请token(落地页据此识别) */
    private String token;

    /** 赋予角色id */
    private Long roleId;

    /** 状态 0待接受 1已接受 2已撤销 3已过期 */
    private Integer status;

    /** 邀请发送次数(再次邀请累加) */
    private Integer sendCount;

    /** 邀请人成员id */
    private Long inviterMemberId;

    /** 接受后生成的成员id(列表"成员"列展示) */
    private Long acceptedMemberId;

    /** 过期时间(默认 72h) */
    private LocalDateTime expireTime;
}
