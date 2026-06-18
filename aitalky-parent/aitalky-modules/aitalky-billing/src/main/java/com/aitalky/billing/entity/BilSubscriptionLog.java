package com.aitalky.billing.entity;

import com.aitalky.framework.mybatis.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

/** 订阅操作日志(后管手动开通/停用留痕)。 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("bil_subscription_log")
public class BilSubscriptionLog extends BaseEntity {

    private Long projectId;
    /** grant 手动开通 / cancel 停用 */
    private String action;
    private String planName;
    private Integer seats;
    private Integer extraCustomers;
    private LocalDateTime expireTime;
    /** 操作后管账号ID */
    private Long operator;
}
