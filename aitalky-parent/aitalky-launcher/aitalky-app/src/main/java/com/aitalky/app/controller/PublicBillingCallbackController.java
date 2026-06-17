package com.aitalky.app.controller;

import com.aitalky.billing.service.BillingWalletService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Coinly 充值到账回调(公共接口,路径 /api/public/** 已放行坐席鉴权;自身靠验签鉴权)。
 * <p>验签 + txid 幂等 + 地址反查项目 + 项目锁 + 乐观锁入账,见 {@link BillingWalletService}。
 * <p>返回纯文本 "success" 作为渠道侧 ack(联调时按 Coinly 实际期望串校正)。
 */
@Slf4j
@RestController
@RequestMapping("/api/public/billing/coinly")
@RequiredArgsConstructor
public class PublicBillingCallbackController {

    private final BillingWalletService walletService;

    @PostMapping("/callback")
    public String callback(@RequestBody Map<String, Object> params) {
        log.info("收到 Coinly 充值回调, txid={}, address={}, amount={}, status={}",
                params.get("txid"), params.get("address"), params.get("amount"), params.get("status"));
        walletService.handleCoinlyCallback(params);
        return "success";
    }
}
