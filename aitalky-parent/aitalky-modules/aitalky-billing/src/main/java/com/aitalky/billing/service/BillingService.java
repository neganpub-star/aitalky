package com.aitalky.billing.service;

import com.aitalky.billing.entity.BilSubscription;

/** 订阅计费服务(订阅/订单/余额;支付渠道在 app 层注入)。第①期:订阅查询 */
public interface BillingService {

    /** 取项目当前订阅(无则 null) */
    BilSubscription getSubscription(Long projectId);

    /**
     * 到期处理:把已过期(expire_time < now 且 status=1)的订阅置为过期(status=0)。
     * <p>定时任务调用,跨项目执行(无租户上下文)。返回处理条数。
     */
    int expireOverdueSubscriptions();
}
