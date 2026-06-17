package com.aitalky.billing.entity;

import com.aitalky.framework.mybatis.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 订阅订单。同项目同时仅一个待支付(下新单作废旧的)。
 * <p>status:0待支付 1已完成 2已作废;type:new新购/renew续费/upgrade升级。
 * <p>sign 为关键字段 HMAC 防改库(改金额/状态会被发现)。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("bil_order")
public class BilOrder extends BaseEntity {

    private String orderNo;
    private Long projectId;
    /** new/renew/upgrade */
    private String type;
    private Long planId;
    private String planName;
    /** 订阅月数(30天/月) */
    private Integer months;
    /** 加购席位数(套餐配额之外) */
    private Integer seats;
    private BigDecimal amount;
    private String currency;
    /** 0待支付 1已完成 2已作废 */
    private Integer status;
    private LocalDateTime paidTime;
    private String sign;
}
