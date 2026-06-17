package com.aitalky.billing.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 订阅计费配置(aitalky.billing.*)。本地明文，上线改环境变量/配置中心。
 *
 * @param signKey    行级防篡改 HMAC 密钥(订单/余额/流水签名)，与数据库分离存放
 * @param addressKey 收款地址 AES-256-GCM 加密密钥(必须 32 字节)
 * @param channel    当前启用支付渠道(对应 PaymentChannel#channelKey，如 coinly)
 * @param coinly     Coinly 渠道配置
 */
@ConfigurationProperties(prefix = "aitalky.billing")
public record BillingProperties(
        String signKey,
        String addressKey,
        String channel,
        Coinly coinly
) {
    /**
     * Coinly 钱包网关配置。
     *
     * @param baseUrl     网关基址(含尾 /api/，拼 v1/...)
     * @param pid         商户/项目标识(公共参数 pid)
     * @param apiKey      签名密钥(MD5 签名时前置拼接，不参与 body)
     * @param callbackUrl 充值到账回调地址
     */
    public record Coinly(
            String baseUrl,
            String pid,
            String apiKey,
            String callbackUrl
    ) {
    }
}
