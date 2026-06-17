package com.aitalky.billing.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * 计费模块装配:绑定 {@link BillingProperties}。
 * <p>渠道实现、service 由组件扫描(com.aitalky.billing.*)自动注册。
 */
@Configuration
@EnableConfigurationProperties(BillingProperties.class)
public class BillingConfig {
}
