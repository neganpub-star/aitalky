package com.aitalky.conversation.entity;

import com.aitalky.framework.mybatis.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/** 客服组。type:1普通(共享队列,参与自动分配的队友) 2专属(带 groupKey 接入标识) */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("asn_group")
public class AsnGroup extends BaseEntity {

    private Long projectId;
    private Integer type;
    private String name;
    /** 组接入标识(URL 的 groupId;专属组才有,普通组为空) */
    private String groupKey;
    private String remark;
}
