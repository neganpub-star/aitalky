package com.aitalky.identity.entity;

import com.aitalky.framework.mybatis.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 项目(租户)。谁创建谁是 owner;对外接入靠 app_id。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("id_project")
public class IdProject extends BaseEntity {

    /** 项目名称 */
    private String name;

    /** 对外接入标识 appId(信使 URL 携带) */
    private String appId;

    /** SDK 密钥 */
    private String appSecret;

    /** 所有者(负责人)账号id */
    private Long ownerAccountId;

    /** 站点 cn中国站/intl国际站 */
    private String site;

    /** 是否专有云(私有化) */
    private Integer isPrivate;

    /** 状态 1正常 0停用 */
    private Integer status;
}
