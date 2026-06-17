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
    /** new/renew/upgrade/addon_seat/addon_customer */
    private String type;
    /** 加购资源类型 seat/customer;套餐单为空 */
    private String resourceType;
    private Long planId;
    private String planName;
    /** 订阅月数(30天/月);加购单为0 */
    private Integer months;
    /** 加购席位数(套餐配额之外) */
    private Integer seats;
    /** 客户配额加购:新增配额总数(套餐/席位单为0) */
    private Integer quantity;
    /** 席位加购计价周期=下单时剩余天数(套餐/客户单为0) */
    private Integer periodDays;
    private BigDecimal amount;
    private String currency;
    /** 0待支付 1已完成 2已作废 */
    private Integer status;
    /** 待支付订单过期时间(下单 + 24h);超时未付由定时任务/查询时作废 */
    private LocalDateTime expireTime;
    private LocalDateTime paidTime;
    private String sign;
}
