package com.aitalky.conversation.entity;

import com.aitalky.framework.mybatis.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/** 普通分配模式-参与自动分配的队友(项目维度) */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("cnv_assign_member")
public class CnvAssignMember extends BaseEntity {

    private Long projectId;
    private Long memberId;
}
