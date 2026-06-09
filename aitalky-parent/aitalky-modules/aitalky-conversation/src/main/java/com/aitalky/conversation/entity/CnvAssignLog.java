package com.aitalky.conversation.entity;

import com.aitalky.framework.mybatis.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/** 会话分配/转派记录。type 1自动分配 2手动认领 3转派 4禁用/删除转派 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("cnv_assign_log")
public class CnvAssignLog extends BaseEntity {
    private Long projectId;
    private Long conversationId;
    private Long fromMemberId;
    private Long toMemberId;
    private Integer type;
    private Long operatorMemberId;
}
