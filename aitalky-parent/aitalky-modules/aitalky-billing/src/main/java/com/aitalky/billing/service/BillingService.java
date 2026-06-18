package com.aitalky.billing.service;

import com.aitalky.billing.entity.BilSubscription;

import java.time.LocalDateTime;

/** 订阅计费服务(订阅/订单/余额;支付渠道在 app 层注入)。第①期:订阅查询 */
public interface BillingService {

    /** 取项目当前订阅(无则 null) */
    BilSubscription getSubscription(Long projectId);

    /**
     * 后管手动开通/调整订阅(送试用,不走支付):upsert 项目订阅,套餐快照+席位+到期时间,status=1。
     * <p>plan 快照由调用方(admin 层有 PlanService)传入;换套餐时加购客户配额重置为 0。
     *
     * @param seats 加购席位(套餐自带之外;null 视为 0)
     */
    void grantSubscription(Long projectId, Long planId, String planCode, String planName,
                           Integer seats, LocalDateTime expireTime);

    /**
     * 到期处理:把已过期(expire_time < now 且 status=1)的订阅置为过期(status=0)。
     * <p>定时任务调用,跨项目执行(无租户上下文)。返回处理条数。
     */
    int expireOverdueSubscriptions();
}
