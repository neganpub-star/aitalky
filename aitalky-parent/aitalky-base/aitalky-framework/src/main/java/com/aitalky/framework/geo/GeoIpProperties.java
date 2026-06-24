package com.aitalky.framework.geo;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * IP 归属地解析配置(aitalky.geoip.*)。
 * <p>当前 provider=ipapi:走 ip-api.com 免费接口(lang=zh-CN 直出中文「国家+省/州+城市」,全球城市级),
 * 异步解析、结果缓存,不阻塞客户接入。后续可平滑切换到离线 MaxMind GeoLite2-City(只换实现,口径不变)。
 *
 * @param enabled    是否开启 IP 归属地解析(关闭则「所在地」留空)
 * @param provider   解析提供方:ipapi(当前)/ 预留 maxmind
 * @param apiBaseUrl ipapi 基址(以 / 结尾,后面直接拼 IP);免费版仅支持 http
 * @param lang       归属地语言。系统中英双语、location 是落库快照,统一存英文地名(国际通用,
 *                   中英界面均可读),避免存死中文后英文坐席看到中文。zh-CN/ja 等会按 CJK 风格拼接
 * @param timeoutMs  单次解析超时(毫秒),避免外网慢拖住异步线程
 * @param cacheDays  解析结果缓存天数(含失败负缓存,防同 IP 重复打 API 触发限速)
 */
@ConfigurationProperties(prefix = "aitalky.geoip")
public record GeoIpProperties(
        boolean enabled,
        String provider,
        String apiBaseUrl,
        String lang,
        int timeoutMs,
        int cacheDays
) {
    public GeoIpProperties {
        if (provider == null || provider.isBlank()) {
            provider = "ipapi";
        }
        if (apiBaseUrl == null || apiBaseUrl.isBlank()) {
            apiBaseUrl = "http://ip-api.com/json/";
        }
        if (lang == null || lang.isBlank()) {
            lang = "en";
        }
        if (timeoutMs <= 0) {
            timeoutMs = 2000;
        }
        if (cacheDays <= 0) {
            cacheDays = 7;
        }
    }
}
