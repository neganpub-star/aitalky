package com.aitalky.conversation.entity;

import com.aitalky.framework.mybatis.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/** 会话设置(分配规则/限制/保持期)。mode:1手动 2轮流 3负载;capacityLimit:0不限 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("asn_config")
public class AsnConfig extends BaseEntity {

    private Long projectId;
    private Integer mode;
    private Integer capacityLimit;
    /** 轮流分配游标:上次分到的 member_id */
    private Long roundRobinCursor;
    /** 会话保持期(分钟),超时自动结束,0不自动 */
    private Integer autoCloseIdleMinutes;
}
