package com.aitalky.framework.storage;

import com.aitalky.common.api.ResultCode;
import com.aitalky.common.exception.BizException;
import io.minio.BucketExistsArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Set;
import java.util.UUID;

/**
 * MinIO 文件上传服务:上传图片/头像,返回可访问 URL。
 * <p><b>容错</b>:参考 RsaCryptoService——未配置 MinIO(端点/密钥/桶缺省)时不初始化客户端,
 * 调用 {@link #upload} 才报错;保证 admin/ws 等不需要文件上传的入口也能正常启动。
 * <p><b>URL 拼接</b>:{@code endpoint/bucket/对象key},对象 key 形如 {@code 2026/06/09/<uuid>.<ext>}
 * (按日期分目录,uuid 防重名)。前提是桶为公开读策略;若桶私有,需改用预签名 URL(此处为本地开发简化方案)。
 */
@Slf4j
@Service
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
public class MinioService {

    /** 允许上传的图片类型(白名单,防止上传可执行文件等) */
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "image/jpeg", "image/png", "image/gif", "image/webp", "image/bmp");

    private static final DateTimeFormatter DATE_DIR = DateTimeFormatter.ofPattern("yyyy/MM/dd");

    private final MinioProperties props;
    /** 未配置时为 null;@PostConstruct 中按配置决定是否初始化 */
    private MinioClient client;

    public MinioService(MinioProperties props) {
        this.props = props;
    }

    @PostConstruct
    public void init() {
        if (!props.isConfigured()) {
            log.warn("MinIO 未配置(aitalky.minio.*),文件上传不可用;如需上传请补全配置");
            return;
        }
        try {
            this.client = MinioClient.builder()
                    .endpoint(props.endpoint())
                    .credentials(props.accessKey(), props.secretKey())
                    .build();
            ensureBucket();
            log.info("MinIO 初始化完成, endpoint={}, bucket={}", props.endpoint(), props.bucket());
        } catch (Exception e) {
            // 初始化失败(如服务未启动)不阻断应用启动,调用上传时再报错
            this.client = null;
            log.warn("MinIO 初始化失败,文件上传暂不可用: {}", e.getMessage());
        }
    }

    /**
     * 上传文件,返回可访问 URL。
     * <p>校验:非空、大小不超限、类型在图片白名单内。
     */
    public String upload(MultipartFile file) {
        if (client == null) {
            // 未配置或初始化失败:调用时才报错
            throw new BizException(ResultCode.SYSTEM_ERROR);
        }
        if (file == null || file.isEmpty()) {
            throw new BizException(ResultCode.PARAM_INVALID);
        }
        if (file.getSize() > props.maxSize()) {
            throw new BizException(ResultCode.PARAM_INVALID);
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType)) {
            throw new BizException(ResultCode.PARAM_INVALID);
        }
        String objectKey = buildObjectKey(file.getOriginalFilename());
        try (InputStream in = file.getInputStream()) {
            client.putObject(PutObjectArgs.builder()
                    .bucket(props.bucket())
                    .object(objectKey)
                    .stream(in, file.getSize(), -1)
                    .contentType(contentType)
                    .build());
        } catch (Exception e) {
            log.error("MinIO 上传失败, object={}", objectKey, e);
            throw new BizException(ResultCode.SYSTEM_ERROR);
        }
        String url = buildUrl(objectKey);
        log.info("文件上传完成, url={}", url);
        return url;
    }

    /** 确保桶存在,不存在则创建 */
    private void ensureBucket() throws Exception {
        boolean exists = client.bucketExists(BucketExistsArgs.builder().bucket(props.bucket()).build());
        if (!exists) {
            client.makeBucket(MakeBucketArgs.builder().bucket(props.bucket()).build());
            log.info("MinIO 自动创建桶: {}", props.bucket());
        }
    }

    /** 对象 key:按日期分目录 + uuid + 原扩展名,避免重名 */
    private String buildObjectKey(String originalName) {
        String ext = "";
        if (originalName != null) {
            int dot = originalName.lastIndexOf('.');
            if (dot >= 0) {
                ext = originalName.substring(dot);
            }
        }
        return LocalDate.now().format(DATE_DIR) + "/" + UUID.randomUUID().toString().replace("-", "") + ext;
    }

    /** 拼接可访问 URL:endpoint/bucket/objectKey(去掉 endpoint 末尾多余斜杠) */
    private String buildUrl(String objectKey) {
        String base = props.endpoint().endsWith("/")
                ? props.endpoint().substring(0, props.endpoint().length() - 1)
                : props.endpoint();
        return base + "/" + props.bucket() + "/" + objectKey;
    }
}
