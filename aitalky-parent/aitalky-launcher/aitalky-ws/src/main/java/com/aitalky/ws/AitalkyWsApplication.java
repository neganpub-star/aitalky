package com.aitalky.ws;

import com.baomidou.mybatisplus.autoconfigure.MybatisPlusAutoConfiguration;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration;
import org.springframework.boot.autoconfigure.jdbc.DataSourceTransactionManagerAutoConfiguration;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * aitalky 实时网关入口（Netty WebSocket）。
 * <p>以 {@code WebApplicationType.NONE} 启动——不起 Tomcat，长连接全走 Netty。
 * <p>保持轻量:不依赖业务模块、不连数据库,故排除 DataSource/MyBatis 自动配置
 * (framework 传递带入 mybatis-plus starter,但 ws 无需 DB)。
 * <p>横向扩展：每实例只持有自己的连接,连接路由存 Redis;跨实例推送经 RocketMQ。
 */
@EnableScheduling // 连接注册表僵尸节点定时对账(ConnectionRegistry.reconcile)
@SpringBootApplication(scanBasePackages = "com.aitalky", exclude = {
        DataSourceAutoConfiguration.class,
        DataSourceTransactionManagerAutoConfiguration.class,
        MybatisPlusAutoConfiguration.class,
})
public class AitalkyWsApplication {

    public static void main(String[] args) {
        new SpringApplicationBuilder(AitalkyWsApplication.class)
                .web(WebApplicationType.NONE)
                .run(args);
    }
}
