package com.aitalky.identity.entity;

import com.aitalky.framework.mybatis.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

/**
 * 链接邀请(可复用,多人通过同一链接加入)。
 * <p>公开链接任何人可加入;私密链接需输入 access_code 才能加入。
 * <p>注意:本表在多租户 IGNORE_TABLES 中,查询需手动带 project_id 条件。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("id_invite_link")
public class IdInviteLink extends BaseEntity {

    /** 项目id */
    private Long projectId;

    /** 链接token */
    private String token;

    /** 赋予角色id */
    private Long roleId;

    /** 邀请形式 0公开 1私密(需验证码) */
    private Integer accessType;

    /** 私密链接的访问验证码 */
    private String accessCode;

    /** 通过该链接加入的人数 */
    private Integer joinCount;

    /** 是否禁用 1是 */
    private Integer disabled;

    /** 创建人成员id */
    private Long inviterMemberId;

    /** 过期时间 */
    private LocalDateTime expireTime;
}
