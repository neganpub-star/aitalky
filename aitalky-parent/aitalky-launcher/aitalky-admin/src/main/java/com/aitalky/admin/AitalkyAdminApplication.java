package com.aitalky.admin;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * aitalky 平台运营后台入口。
 * <p>独立部署：god 权限（管全平台用户/订阅/订单/套餐/协议）与租户 API 进程隔离，降低越权风险。
 * <p>登录主体为 pf_admin（平台管理员），与 id_account（租户账号）是两套登录。
 */
@SpringBootApplication(scanBasePackages = "com.aitalky")
@MapperScan("com.aitalky.**.mapper")
public class AitalkyAdminApplication {

    public static void main(String[] args) {
        SpringApplication.run(AitalkyAdminApplication.class, args);
    }
}
