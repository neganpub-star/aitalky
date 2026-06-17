package com.aitalky.billing.service;

import com.aitalky.billing.entity.BilSubscription;

/** 订阅计费服务(订阅/订单/余额;支付渠道在 app 层注入)。第①期:订阅查询 */
public interface BillingService {

    /** 取项目当前订阅(无则 null) */
    BilSubscription getSubscription(Long projectId);
}
