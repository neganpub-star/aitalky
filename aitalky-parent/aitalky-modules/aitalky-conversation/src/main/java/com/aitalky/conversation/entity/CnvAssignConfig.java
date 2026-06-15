package com.aitalky.conversation.entity;

import com.aitalky.framework.mybatis.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/** 会话分配配置(项目维度)。assignMode:0手动 1轮流 2负载;maxConcurrent:0=不限 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("cnv_assign_config")
public class CnvAssignConfig extends BaseEntity {

    private Long projectId;
    private Integer assignMode;
    private Integer maxConcurrent;
    /** 轮流分配游标:上次分到的 member_id */
    private Long roundRobinCursor;
}
