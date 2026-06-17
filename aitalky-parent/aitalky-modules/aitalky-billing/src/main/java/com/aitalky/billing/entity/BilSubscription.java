package com.aitalky.billing.entity;

import com.aitalky.framework.mybatis.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

/** 项目订阅:当前生效套餐 + 到期时间。每项目一条(uk project_id)。status:1有效 0已过期 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("bil_subscription")
public class BilSubscription extends BaseEntity {

    private Long projectId;
    private Long planId;
    /** 套餐编码/名称快照(套餐改名/调价不回溯已订) */
    private String planCode;
    private String planName;
    private Integer status;
    private LocalDateTime startTime;
    private LocalDateTime expireTime;
}
