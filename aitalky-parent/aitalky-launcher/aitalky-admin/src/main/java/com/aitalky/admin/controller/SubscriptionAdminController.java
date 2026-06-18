package com.aitalky.admin.controller;

import com.aitalky.admin.dto.GrantSubscriptionCmd;
import com.aitalky.admin.dto.ProjectSubscriptionVO;
import com.aitalky.billing.entity.BilSubscription;
import com.aitalky.billing.service.BillingService;
import com.aitalky.billing.service.dto.SubscriptionLogVO;
import com.aitalky.common.api.R;
import com.aitalky.common.api.ResultCode;
import com.aitalky.common.exception.BizException;
import com.aitalky.customer.service.CustomerService;
import com.aitalky.framework.tenant.TenantContext;
import com.aitalky.framework.web.RequiresFunction;
import com.aitalky.identity.service.MemberService;
import com.aitalky.platform.dto.PlanQuotaVO;
import com.aitalky.platform.dto.PlanVO;
import com.aitalky.platform.service.ConfigService;
import com.aitalky.platform.service.PlanService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 项目订阅管理(平台权限 subscriptions):查看某项目订阅情况+资源用量 / 手动开通试用。
 * <p>跨项目操作(admin 无租户上下文,多租户过滤整体忽略),按 projectId 显式查询。
 */
@RestController
@RequestMapping("/api/admin/projects/{projectId}/subscription")
@RequiredArgsConstructor
public class SubscriptionAdminController {

    private final BillingService billingService;
    private final PlanService planService;
    private final MemberService memberService;
    private final CustomerService customerService;
    private final ConfigService configService;

    /** 项目订阅详情 + 资源用量 */
    @RequiresFunction("subscriptions")
    @GetMapping
    public R<ProjectSubscriptionVO> detail(@PathVariable Long projectId) {
        int trialDays = configService.getInt("free_trial_days", 15);
        long seatUsed = memberService.countActiveMembers(projectId);
        long customerUsed = customerService.countByProject(projectId);

        BilSubscription sub = billingService.getSubscription(projectId);
        if (sub == null) {
            return R.ok(new ProjectSubscriptionVO(false, null, null, null, null, null, false,
                    0, 0, seatUsed, 0, customerUsed, 0, List.of(), trialDays));
        }
        PlanVO plan = planService.get(sub.getPlanId());
        boolean expired = sub.getExpireTime() != null && sub.getExpireTime().isBefore(LocalDateTime.now());
        int extraSeats = sub.getSeats() == null ? 0 : sub.getSeats();
        int extraCustomers = sub.getExtraCustomers() == null ? 0 : sub.getExtraCustomers();

        long seatTotal = extraSeats;
        long customerTotal = extraCustomers;
        List<PlanQuotaVO> quotas = plan == null ? List.of() : plan.quotas();
        for (PlanQuotaVO q : quotas) {
            boolean unlimited = q.isUnlimited() != null && q.isUnlimited() == 1;
            long amount = q.amount() == null ? 0 : q.amount();
            if ("seat".equals(q.resourceType())) {
                seatTotal = unlimited ? -1 : amount + extraSeats;
            } else if ("customer".equals(q.resourceType())) {
                customerTotal = unlimited ? -1 : amount + extraCustomers;
            }
        }
        return R.ok(new ProjectSubscriptionVO(true, sub.getPlanId(), sub.getPlanCode(), sub.getPlanName(),
                sub.getStatus(), sub.getExpireTime(), expired, extraSeats, extraCustomers,
                seatUsed, seatTotal, customerUsed, customerTotal, quotas, trialDays));
    }

    /** 手动开通/调整订阅(送试用,不走支付) */
    @RequiresFunction("subscriptions")
    @PostMapping
    public R<Void> grant(@PathVariable Long projectId, @Valid @RequestBody GrantSubscriptionCmd cmd) {
        PlanVO plan = planService.get(cmd.planId()); // 不存在抛 NOT_FOUND
        if (plan.isCustom() != null && plan.isCustom() == 1) {
            throw new BizException(ResultCode.BILLING_PLAN_UNAVAILABLE); // 定制版不支持直接开通
        }
        billingService.grantSubscription(projectId, plan.id(), plan.code(), plan.name(),
                cmd.seats(), cmd.extraCustomers(), cmd.expireTime(), TenantContext.getAccountId());
        return R.ok();
    }

    /** 停用项目订阅(status=0 立即过期,触发订阅门禁) */
    @RequiresFunction("subscriptions")
    @PostMapping("/cancel")
    public R<Void> cancel(@PathVariable Long projectId) {
        billingService.cancelSubscription(projectId, TenantContext.getAccountId());
        return R.ok();
    }

    /** 订阅操作日志(后管手动开通/停用) */
    @RequiresFunction("subscriptions")
    @GetMapping("/logs")
    public R<List<SubscriptionLogVO>> logs(@PathVariable Long projectId) {
        return R.ok(billingService.listSubscriptionLogs(projectId));
    }
}
