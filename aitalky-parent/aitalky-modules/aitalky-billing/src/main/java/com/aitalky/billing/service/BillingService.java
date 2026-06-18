package com.aitalky.billing.service;

import com.aitalky.billing.entity.BilSubscription;
import com.aitalky.billing.service.dto.SubscriptionLogVO;

import java.time.LocalDateTime;
import java.util.List;

/** 订阅计费服务(订阅/订单/余额;支付渠道在 app 层注入)。第①期:订阅查询 */
public interface BillingService {

    /** 取项目当前订阅(无则 null) */
    BilSubscription getSubscription(Long projectId);

    /**
     * 后管手动开通/调整订阅(送试用,不走支付):upsert 项目订阅,套餐快照+席位+到期时间,status=1。
     * <p>客户/翻译/Tokens 为项目级永久包(bil_project_resource),由「调整扩展额度」单独操作,不在此处。
     * <p>记一条 grant 操作日志(operator=后管账号ID)。
     *
     * @param seats 加购席位(套餐自带之外;null 视为 0)
     */
    void grantSubscription(Long projectId, Long planId, String planCode, String planName,
                           Integer seats, LocalDateTime expireTime, Long operator);

    /** 后管停用项目订阅:status=0 且 expireTime=now,立即触发订阅门禁(前后端一致),记 cancel 日志 */
    void cancelSubscription(Long projectId, Long operator);

    /** 订阅操作日志(后管手动开通/停用,按时间倒序) */
    List<SubscriptionLogVO> listSubscriptionLogs(Long projectId);

    /**
     * 到期处理:把已过期(expire_time < now 且 status=1)的订阅置为过期(status=0)。
     * <p>定时任务调用,跨项目执行(无租户上下文)。返回处理条数。
     */
    int expireOverdueSubscriptions();
}
