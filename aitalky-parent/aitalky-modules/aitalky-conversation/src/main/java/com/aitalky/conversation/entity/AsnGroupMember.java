package com.aitalky.conversation.entity;

import com.aitalky.framework.mybatis.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/** 客服组成员(普通组=参与自动分配的队友;专属组=该组队友) */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("asn_group_member")
public class AsnGroupMember extends BaseEntity {

    private Long projectId;
    private Long groupId;
    private Long memberId;
}
