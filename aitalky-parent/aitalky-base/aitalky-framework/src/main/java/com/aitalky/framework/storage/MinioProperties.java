package com.aitalky.framework.storage;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * MinIO 对象存储配置(aitalky.minio.*)。
 * <p>未配置(如 admin/ws 入口不需要文件上传)时各字段为 null,{@link MinioService} 容错:
 * 不初始化客户端,仅在真正调用上传时报错,保证这些入口仍能正常启动。
 *
 * @param endpoint   MinIO 服务地址(如 http://localhost:9000)
 * @param accessKey  访问 Key
 * @param secretKey  访问 Secret(敏感,上线用环境变量/配置中心)
 * @param bucket     存储桶名(不存在则自动创建)
 * @param maxSize    单文件大小上限(字节),默认 10MB
 */
@ConfigurationProperties(prefix = "aitalky.minio")
public record MinioProperties(
        String endpoint,
        String accessKey,
        String secretKey,
        String bucket,
        long maxSize
) {
    public MinioProperties {
        if (maxSize <= 0) {
            maxSize = 10L * 1024 * 1024; // 默认 10MB
        }
    }

    /** 配置是否完整(端点/密钥/桶均已填写),决定 MinioService 能否初始化客户端 */
    public boolean isConfigured() {
        return notBlank(endpoint) && notBlank(accessKey) && notBlank(secretKey) && notBlank(bucket);
    }

    private static boolean notBlank(String s) {
        return s != null && !s.isBlank();
    }
}
