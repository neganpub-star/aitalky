package com.aitalky.identity.entity;

import com.aitalky.framework.mybatis.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 角色(项目内 RBAC)。预置 负责人/管理员/普通成员(is_system=1,名与权限不可改)。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("id_role")
public class IdRole extends BaseEntity {

    /** 项目id */
    private Long projectId;

    /** 角色名称 */
    private String name;

    /** 是否预置 1是(名/权限不可改) */
    private Integer isSystem;

    /** 权限 JSON 文本: {"pages":[...],"functions":[...]} */
    private String permissions;
}
