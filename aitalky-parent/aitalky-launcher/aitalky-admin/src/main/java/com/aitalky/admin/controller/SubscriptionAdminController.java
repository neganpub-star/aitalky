package com.aitalky.admin.controller;

import com.aitalky.admin.dto.AdjustResourceCmd;
import com.aitalky.admin.dto.GrantSubscriptionCmd;
import com.aitalky.admin.dto.ProjectSubscriptionVO;
import com.aitalky.billing.entity.BilSubscription;
import com.aitalky.billing.service.BillingService;
import com.aitalky.billing.service.QuotaService;
import com.aitalky.billing.service.dto.QuotaLimit;
import com.aitalky.billing.service.dto.SubscriptionLogVO;
import com.aitalky.common.api.R;
import com.aitalky.common.api.ResultCode;
import com.aitalky.common.exception.BizException;
import com.aitalky.customer.service.CustomerService;
import com.aitalky.framework.tenant.TenantContext;
import com.aitalky.framework.web.RequiresFunction;
import com.aitalky.identity.service.MemberService;
import com.aitalky.platform.dto.PlanVO;
import com.aitalky.platform.service.ConfigService;
import com.aitalky.platform.service.PlanService;

import java.util.Set;
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
    private final QuotaService quotaService;

    /** 可由后管单独调整的永久加量包资源 */
    private static final Set<String> PACK_TYPES = Set.of("customer", "translate_char", "ai_tokens");

    /** 项目订阅详情 + 资源用量(总量统一走 QuotaService,-1=无限) */
    @RequiresFunction("subscriptions")
    @GetMapping
    public R<ProjectSubscriptionVO> detail(@PathVariable Long projectId) {
        int trialDays = configService.getInt("free_trial_days", 15);
        long seatUsed = memberService.countActiveMembers(projectId);
        long customerUsed = customerService.countByProject(projectId);

        BilSubscription sub = billingService.getSubscription(projectId);
        boolean subscribed = sub != null;
        PlanVO plan = sub == null ? null : planService.get(sub.getPlanId());
        boolean expired = sub != null && sub.getExpireTime() != null && sub.getExpireTime().isBefore(LocalDateTime.now());

        return R.ok(new ProjectSubscriptionVO(
                subscribed,
                sub == null ? null : sub.getPlanId(),
                sub == null ? null : sub.getPlanCode(),
                sub == null ? null : sub.getPlanName(),
                sub == null ? null : sub.getStatus(),
                sub == null ? null : sub.getExpireTime(),
                expired,
                sub == null || sub.getSeats() == null ? 0 : sub.getSeats(),
                seatUsed, total(projectId, "seat"),
                customerUsed, total(projectId, "customer"),
                total(projectId, "article"), total(projectId, "site"),
                total(projectId, "translate_char"), total(projectId, "ai_tokens"),
                plan == null ? List.of() : plan.quotas(),
                trialDays));
    }

    /** 资源总量(无限返回 -1) */
    private long total(Long projectId, String resourceType) {
        QuotaLimit l = quotaService.limit(projectId, resourceType);
        return l.unlimited() ? -1 : l.limit();
    }

    /** 手动开通/调整订阅(送试用,不走支付;客户/翻译/Tokens 走「调整扩展额度」) */
    @RequiresFunction("subscriptions")
    @PostMapping
    public R<Void> grant(@PathVariable Long projectId, @Valid @RequestBody GrantSubscriptionCmd cmd) {
        PlanVO plan = planService.get(cmd.planId()); // 不存在抛 NOT_FOUND
        if (plan.isCustom() != null && plan.isCustom() == 1) {
            throw new BizException(ResultCode.BILLING_PLAN_UNAVAILABLE); // 定制版不支持直接开通
        }
        billingService.grantSubscription(projectId, plan.id(), plan.code(), plan.name(),
                cmd.seats(), cmd.expireTime(), TenantContext.getAccountId());
        return R.ok();
    }

    /** 调整项目扩展额度(永久加量包 customer/translate_char/ai_tokens;覆盖设置已购量) */
    @RequiresFunction("subscriptions")
    @PostMapping("/resource")
    public R<Void> adjustResource(@PathVariable Long projectId, @Valid @RequestBody AdjustResourceCmd cmd) {
        if (!PACK_TYPES.contains(cmd.resourceType())) {
            throw new BizException(ResultCode.PARAM_INVALID);
        }
        quotaService.setPack(projectId, cmd.resourceType(), cmd.amount() == null ? 0 : cmd.amount());
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
