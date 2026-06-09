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

    /** 密码哈希(BCrypt;严禁打日志) */
    private String passwordHash;

    /** 状态 1正常 0禁用 */
    private Integer status;
}
