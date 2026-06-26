package com.aitalky.framework.ratelimit;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 限流配置(aitalky.rate-limit.*)。
 *
 * @param trustForwardHeaders 是否信任 {@code X-Forwarded-For} 取客户端 IP。
 *                            <p><b>安全默认 false</b>:直接取 TCP 连接的 remoteAddr,应用层无法伪造,
 *                            杜绝攻击者用伪造 XFF 绕过按 IP 限流。
 *                            <p>仅当 app 部署在<b>可信反向代理</b>之后、且该代理用 {@code proxy_set_header
 *                            X-Forwarded-For $remote_addr}「覆盖」(而非追加)真实客户端 IP 时,才可置 true。
 */
@ConfigurationProperties(prefix = "aitalky.rate-limit")
public record RateLimitProperties(boolean trustForwardHeaders) {
}
