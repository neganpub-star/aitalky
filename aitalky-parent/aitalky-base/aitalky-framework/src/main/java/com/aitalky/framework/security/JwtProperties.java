package com.aitalky.framework.security;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * JWT 配置项（aitalky.jwt.*）。
 *
 * @param secret      签名密钥（生产环境必须用环境变量注入，禁止硬编码）
 * @param expireHours access token 有效期（小时）
 * @param header      token 所在请求头
 * @param prefix      token 前缀
 */
@ConfigurationProperties(prefix = "aitalky.jwt")
public record JwtProperties(
        String secret,
        long expireHours,
        String header,
        String prefix
) {
    public JwtProperties {
        if (header == null || header.isBlank()) {
            header = "Authorization";
        }
        if (prefix == null) {
            prefix = "Bearer ";
        }
        if (expireHours <= 0) {
            expireHours = 12;
        }
    }
}
