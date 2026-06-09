package com.aitalky.framework.i18n;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.support.ReloadableResourceBundleMessageSource;

import java.nio.charset.StandardCharsets;

/**
 * i18n 资源配置：加载 classpath:i18n/messages_*.properties。
 */
@Configuration
public class I18nConfig {

    @Bean
    public ReloadableResourceBundleMessageSource messageSource() {
        ReloadableResourceBundleMessageSource source = new ReloadableResourceBundleMessageSource();
        source.setBasename("classpath:i18n/messages");
        source.setDefaultEncoding(StandardCharsets.UTF_8.name());
        // 找不到当前语言时回退到默认（messages.properties），再找不到由 MessageUtil 返回 key
        source.setUseCodeAsDefaultMessage(false);
        source.setFallbackToSystemLocale(false);
        source.setCacheSeconds(3600);
        return source;
    }
}
