package com.aitalky.framework.config;

import com.aitalky.framework.security.JwtProperties;
import com.aitalky.framework.verify.VerifyCodeProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * framework 模块配置入口：启用配置属性绑定。
 * <p>各部署入口（app/admin/ws）以 {@code scanBasePackages="com.aitalky"} 扫描即可装配本模块全部 Bean。
 */
@Configuration
@EnableConfigurationProperties({JwtProperties.class, VerifyCodeProperties.class})
public class FrameworkConfig {
}
