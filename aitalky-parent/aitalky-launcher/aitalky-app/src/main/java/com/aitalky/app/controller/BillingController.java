package com.aitalky.app.controller;

import com.aitalky.app.dto.BillingOverviewVO;
import com.aitalky.billing.entity.BilSubscription;
import com.aitalky.billing.service.BillingAddressService;
import com.aitalky.billing.service.BillingService;
import com.aitalky.billing.service.BillingWalletService;
import com.aitalky.billing.service.dto.CoinVO;
import com.aitalky.billing.service.dto.RechargeAddressVO;
import com.aitalky.billing.service.dto.WalletVO;
import com.aitalky.common.api.R;
import com.aitalky.framework.tenant.TenantContext;
import com.aitalky.platform.dto.PlanVO;
import com.aitalky.platform.service.PlanService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
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
    private final BillingAddressService addressService;
    private final BillingWalletService walletService;

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
            return R.ok(new BillingOverviewVO(false, null, null, null, null, null, false, List.of(), List.of()));
        }
        PlanVO plan = planService.get(sub.getPlanId());
        boolean expired = sub.getExpireTime() != null && sub.getExpireTime().isBefore(LocalDateTime.now());
        return R.ok(new BillingOverviewVO(
                true, sub.getPlanId(), sub.getPlanCode(), sub.getPlanName(), plan == null ? null : plan.level(),
                sub.getExpireTime(), expired,
                plan == null ? List.of() : plan.quotas(),
                plan == null ? List.of() : plan.features()));
    }

    /** 可充值币种(选网络:USDT TRC20/ERC20) */
    @GetMapping("/coins")
    public R<List<CoinVO>> coins() {
        return R.ok(addressService.listCoins());
    }

    /** 当前项目钱包余额 */
    @GetMapping("/wallet")
    public R<WalletVO> wallet() {
        Long projectId = TenantContext.getProjectId();
        return R.ok(new WalletVO(walletService.getBalance(projectId), "USDT"));
    }

    /** 取/建项目在指定币种所属链上的固定收款地址(充值用) */
    @PostMapping("/address")
    public R<RechargeAddressVO> address(@RequestParam String currency) {
        Long projectId = TenantContext.getProjectId();
        return R.ok(addressService.getOrCreateAddress(projectId, currency));
    }
}
