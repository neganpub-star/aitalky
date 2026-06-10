package com.aitalky.platform.entity;

import com.aitalky.framework.mybatis.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 平台角色(平台 RBAC)。
 * <p>permissions 为 JSON 数组文本,如 ["users","tenants","subscriptions","orders","plans","addons","agreements","stats"];
 * 登录时取出塞进 JWT 的 functions claim,沿用 {@code @RequiresFunction} 校验。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("pf_admin_role")
public class PfAdminRole extends BaseEntity {

    /** 角色名称 */
    private String name;

    /** 平台模块权限 JSON 数组文本 */
    private String permissions;
}
