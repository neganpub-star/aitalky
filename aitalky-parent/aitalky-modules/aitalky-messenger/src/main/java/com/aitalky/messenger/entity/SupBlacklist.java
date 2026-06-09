package com.aitalky.messenger.entity;

import com.aitalky.framework.mybatis.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/** 黑名单。target_type: 1用户(业务UID,全设备生效) 2设备(游客visitorId)。project_id 由多租户拦截器自动注入。 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("sup_blacklist")
public class SupBlacklist extends BaseEntity {

    private Long projectId;
    private Integer targetType;
    private String targetValue;
    private String reason;
}
