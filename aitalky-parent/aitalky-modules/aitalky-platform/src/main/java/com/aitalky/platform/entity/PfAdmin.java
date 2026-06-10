package com.aitalky.platform.entity;

import com.aitalky.framework.mybatis.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 平台管理员(运营方登录主体)。
 * <p>与租户账号 id_account 是两套登录:这里用 username + 密码,无邮箱 2FA。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("pf_admin")
public class PfAdmin extends BaseEntity {

    /** 登录名 */
    private String username;

    /** 密码哈希(BCrypt;严禁打日志) */
    private String passwordHash;

    /** 姓名 */
    private String realName;

    /** 平台角色id(pf_admin_role) */
    private Long roleId;

    /** 状态 1正常 0禁用 */
    private Integer status;
}
