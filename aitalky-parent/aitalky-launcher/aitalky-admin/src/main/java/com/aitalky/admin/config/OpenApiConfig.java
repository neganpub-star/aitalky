package com.aitalky.admin.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Knife4j / OpenAPI 文档配置(admin 入口)。
 * <p>访问 {@code /doc.html} 查看接口文档(放行清单已在 WebMvcConfig 配置)。
 * 仅声明基本信息,接口由 springdoc 自动扫描 Controller 列出,无需逐个加注解。
 */
@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI aitalkyOpenApi() {
        return new OpenAPI().info(new Info()
                .title("aitalky Admin API")
                .version("v1")
                .description("aitalky 智能客服系统 - 平台运营后台 API"));
    }
}
