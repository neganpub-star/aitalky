package com.aitalky.identity.entity;

import com.aitalky.framework.mybatis.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 租户账号(坐席侧登录主体)。一个账号可加入多个项目,成为不同项目的成员。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("id_account")
public class IdAccount extends BaseEntity {

    /** 邮箱(登录名,收验证码) */
    private String email;

    /** 用户名(账号显示名,可改;登录仍用邮箱) */
    private String username;

    /** 邀请码(注册裂变码,全局唯一;展示给他人注册时填) */
    private String inviteCode;

    /** 邀请人账号id(注册时所填邀请码的归属账号) */
    private Long inviterAccountId;

    /** 密码哈希(BCrypt;严禁打日志) */
    private String passwordHash;

    /** 状态 1正常 0禁用 */
    private Integer status;
}
