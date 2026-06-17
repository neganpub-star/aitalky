package com.aitalky.app.controller;

import com.aitalky.app.dto.BillingOverviewVO;
import com.aitalky.billing.entity.BilSubscription;
import com.aitalky.billing.service.BillingService;
import com.aitalky.common.api.R;
import com.aitalky.framework.tenant.TenantContext;
import com.aitalky.platform.dto.PlanVO;
import com.aitalky.platform.service.PlanService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 服务订阅(坐席端):套餐展示 + 概览。下单/充值/升级续费见后续期。
 * <p>套餐定义复用平台 PlanService(只暴露上架);概览取本项目订阅 + 套餐配额。
 */
@RestController
@RequestMapping("/api/billing")
@RequiredArgsConstructor
public class BillingController {

    private final PlanService planService;
    private final BillingService billingService;

    /** 上架套餐列表(含配额/功能;对齐套餐订阅页卡片) */
    @GetMapping("/plans")
    public R<List<PlanVO>> plans() {
        List<PlanVO> list = planService.list().stream()
                .filter(p -> p.status() != null && p.status() == 1)
                .toList();
        return R.ok(list);
    }

    /** 当前项目订阅概览 */
    @GetMapping("/overview")
    public R<BillingOverviewVO> overview() {
        Long projectId = TenantContext.getProjectId();
        BilSubscription sub = billingService.getSubscription(projectId);
        if (sub == null) {
            return R.ok(new BillingOverviewVO(false, null, null, null, null, false, List.of(), List.of()));
        }
        PlanVO plan = planService.get(sub.getPlanId());
        boolean expired = sub.getExpireTime() != null && sub.getExpireTime().isBefore(LocalDateTime.now());
        return R.ok(new BillingOverviewVO(
                true, sub.getPlanId(), sub.getPlanName(), plan == null ? null : plan.level(),
                sub.getExpireTime(), expired,
                plan == null ? List.of() : plan.quotas(),
                plan == null ? List.of() : plan.features()));
    }
}
