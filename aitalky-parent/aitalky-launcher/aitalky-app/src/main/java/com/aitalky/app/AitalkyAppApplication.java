package com.aitalky.app;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.mongodb.repository.config.EnableMongoRepositories;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * aitalky 业务 API 入口（坐席端/信使端 REST）。
 * <p>无状态：JWT 鉴权 + 状态全放 Redis，可 LB 后挂 N 实例横向扩展。
 * <p>装配 identity/messenger/routing/customer/conversation/message/billing 业务模块 + framework 基建。
 */
@SpringBootApplication(scanBasePackages = "com.aitalky")
@MapperScan("com.aitalky.**.mapper")
@EnableMongoRepositories("com.aitalky")
@EnableScheduling
public class AitalkyAppApplication {

    public static void main(String[] args) {
        SpringApplication.run(AitalkyAppApplication.class, args);
    }
}
