package com.aitalky.framework.translate;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 翻译配置(aitalky.translate.*)。引擎可配可扩:换/加引擎只改 provider + 加一个 {@link TranslateProvider} 实现。
 *
 * @param enabled       是否开启翻译(关闭则翻译接口返回未启用)
 * @param provider      当前使用的引擎 key(ali-gateway=阿里云机翻网关;后续可加 claude 等)
 * @param aliGatewayUrl ali-gateway 引擎地址(复用 cicada 自建翻译网关:POST {text,targetLanguage})
 * @param timeoutMs     单次翻译超时(毫秒)
 */
@ConfigurationProperties(prefix = "aitalky.translate")
public record TranslateProperties(
        boolean enabled,
        String provider,
        String aliGatewayUrl,
        int timeoutMs
) {
    public TranslateProperties {
        if (provider == null || provider.isBlank()) {
            provider = "ali-gateway";
        }
        if (aliGatewayUrl == null || aliGatewayUrl.isBlank()) {
            aliGatewayUrl = "http://47.242.9.154:8080/api/translate/auto";
        }
        if (timeoutMs <= 0) {
            timeoutMs = 8000;
        }
    }
}
