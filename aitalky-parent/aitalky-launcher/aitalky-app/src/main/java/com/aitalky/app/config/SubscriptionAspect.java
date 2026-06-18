package com.aitalky.app.config;

import com.aitalky.billing.entity.BilSubscription;
import com.aitalky.billing.service.BillingService;
import com.aitalky.common.api.ResultCode;
import com.aitalky.common.exception.BizException;
import com.aitalky.framework.tenant.TenantContext;
import lombok.RequiredArgsConstructor;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/**
 * 订阅门禁切面:对标注 {@link com.aitalky.framework.web.RequiresSubscription} 的接口(类或方法),
 * 校验当前项目有「有效订阅」(status=1 且未到期),否则抛 {@link ResultCode#NO_SUBSCRIPTION},
 * 前端据此弹订阅遮罩引导前往订阅。
 * <p>放在 app 层(而非 framework)是因为 framework 不依赖 billing;此处可注入 {@link BillingService}。
 * <p>无租户上下文(理论不达,authed 接口都有 projectId)时放行,交由鉴权层处理。
 */
@Aspect
@Component
@RequiredArgsConstructor
public class SubscriptionAspect {

    private final BillingService billingService;

    @Before("@within(com.aitalky.framework.web.RequiresSubscription) "
            + "|| @annotation(com.aitalky.framework.web.RequiresSubscription)")
    public void checkSubscription() {
        Long projectId = TenantContext.getProjectId();
        if (projectId == null) {
            return;
        }
        BilSubscription sub = billingService.getSubscription(projectId);
        boolean active = sub != null && sub.getStatus() != null && sub.getStatus() == 1
                && sub.getExpireTime() != null && sub.getExpireTime().isAfter(LocalDateTime.now());
        if (!active) {
            throw new BizException(ResultCode.NO_SUBSCRIPTION);
        }
    }
}
