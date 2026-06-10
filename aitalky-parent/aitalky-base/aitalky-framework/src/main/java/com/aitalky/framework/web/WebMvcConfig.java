package com.aitalky.framework.web;

import com.aitalky.framework.security.JwtProperties;
import com.aitalky.framework.security.JwtUtil;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Web MVC 配置：注册鉴权拦截器。
 * <p>{@code @ConditionalOnWebApplication(SERVLET)} → 仅 servlet web 入口（app/admin）生效；
 * ws 入口以 {@code web-application-type=none} 启动，不加载本配置。
 * <p>放行清单：登录、信使公共接口（按 appId 鉴权而非 JWT）、健康检查、文档。
 */
@Configuration
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
public class WebMvcConfig implements WebMvcConfigurer {

    private final JwtUtil jwtUtil;
    private final JwtProperties jwtProperties;

    public WebMvcConfig(JwtUtil jwtUtil, JwtProperties jwtProperties) {
        this.jwtUtil = jwtUtil;
        this.jwtProperties = jwtProperties;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        // 功能权限拦截器(在鉴权之后执行,此时上下文已填充 functions)
        registry.addInterceptor(new FunctionPermissionInterceptor())
                .addPathPatterns("/api/**")
                .order(2);
        registry.addInterceptor(new AuthInterceptor(jwtUtil, jwtProperties))
                .addPathPatterns("/api/**")
                .order(1)
                .excludePathPatterns(
                        "/api/auth/login",
                        "/api/auth/register",
                        "/api/auth/send-code",
                        "/api/auth/public-key",
                        "/api/auth/captcha",
                        "/api/admin/auth/login",       // 平台后管登录
                        "/api/admin/auth/public-key",  // 平台后管 RSA 公钥
                        "/api/admin/auth/captcha",     // 平台后管图形验证码
                        "/api/public/**",   // 信使端公共接口（按 appId/groupId 鉴权）
                        "/api/ping",         // 健康检查样例
                        "/actuator/**",
                        "/doc.html", "/swagger-ui/**", "/v3/api-docs/**",
                        "/webjars/**"   // Knife4j/swagger-ui 前端静态资源
                );
    }
}
