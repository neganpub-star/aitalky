package com.aitalky.ws;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.builder.SpringApplicationBuilder;

/**
 * aitalky 实时网关入口（Netty WebSocket）。
 * <p>以 {@code WebApplicationType.NONE} 启动——不起 Tomcat，长连接全走 Netty；
 * 故 framework 中 {@code @ConditionalOnWebApplication} 的 web 拦截器/异常处理不会加载。
 * <p>横向扩展：每实例只持有自己的连接，连接路由信息存 Redis；跨实例推送经 RocketMQ 广播。
 */
@SpringBootApplication(scanBasePackages = "com.aitalky")
public class AitalkyWsApplication {

    public static void main(String[] args) {
        new SpringApplicationBuilder(AitalkyWsApplication.class)
                .web(WebApplicationType.NONE)
                .run(args);
    }
}
