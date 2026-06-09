package com.aitalky.framework.id;

import com.aitalky.common.id.SnowflakeIdGenerator;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * 雪花 ID 生成器配置。
 * <p><b>横向扩展关键</b>：每个实例必须配置不同的 (datacenterId, workerId)，否则多实例会生成重复 ID。
 * 配置项 aitalky.id.datacenter-id / aitalky.id.worker-id；K8s 部署可由 Pod 序号/环境变量注入。
 */
@Configuration
public class IdConfig {

    @Bean
    public SnowflakeIdGenerator snowflakeIdGenerator(
            @Value("${aitalky.id.datacenter-id:0}") long datacenterId,
            @Value("${aitalky.id.worker-id:0}") long workerId) {
        return new SnowflakeIdGenerator(datacenterId, workerId);
    }
}
