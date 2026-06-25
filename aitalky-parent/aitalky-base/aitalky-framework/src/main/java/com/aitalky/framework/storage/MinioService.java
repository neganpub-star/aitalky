package com.aitalky.framework.storage;

import com.aitalky.common.api.ResultCode;
import com.aitalky.common.exception.BizException;
import io.minio.BucketExistsArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.ListObjectsArgs;
import io.minio.PutObjectArgs;
import io.minio.SetBucketPolicyArgs;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.HashSet;
import java.util.Map;
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

    // 按"扩展名"白名单(比 content-type 可靠,且能挡住 exe/sh/js/html 等可执行/脚本)。
    // 分三类,各自大小上限不同:图片 10MB / 文档 50MB / 视频 100MB。
    private static final Set<String> IMAGE_EXT = Set.of("jpg", "jpeg", "png", "gif", "webp", "bmp", "ico");
    private static final Set<String> VIDEO_EXT = Set.of("mp4", "webm", "mov");
    private static final Set<String> DOC_EXT = Set.of(
            "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv", "zip", "rar", "7z");
    private static final long IMAGE_MAX = 10L * 1024 * 1024;
    private static final long DOC_MAX = 20L * 1024 * 1024;   // 文档/视频暂定 20MB,后续按需调整
    private static final long VIDEO_MAX = 20L * 1024 * 1024;

    /**
     * 扩展名 → content-type 映射(安全关键):存储用的 content-type <b>按校验后的扩展名推断,绝不信客户端</b>。
     * 否则攻击者可上传 .png 但把 content-type 设成 text/html,桶匿名只读原样返回 → MinIO 域名下存储型 XSS。
     * 不在表内的(已通过白名单的文档/压缩包等)统一回退 application/octet-stream(浏览器下载而非渲染)。
     */
    private static final Map<String, String> CONTENT_TYPES = Map.ofEntries(
            Map.entry("jpg", "image/jpeg"), Map.entry("jpeg", "image/jpeg"), Map.entry("png", "image/png"),
            Map.entry("gif", "image/gif"), Map.entry("webp", "image/webp"), Map.entry("bmp", "image/bmp"),
            Map.entry("ico", "image/x-icon"),
            Map.entry("mp4", "video/mp4"), Map.entry("webm", "video/webm"), Map.entry("mov", "video/quicktime"),
            Map.entry("pdf", "application/pdf"), Map.entry("txt", "text/plain"), Map.entry("csv", "text/csv"));

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
            seedDefaultAvatars();
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
        // 按扩展名判类并取对应大小上限;不在白名单(含 exe/脚本)直接拒
        String ext = ext(file.getOriginalFilename());
        long limit;
        if (IMAGE_EXT.contains(ext)) {
            limit = IMAGE_MAX;
        } else if (VIDEO_EXT.contains(ext)) {
            limit = VIDEO_MAX;
        } else if (DOC_EXT.contains(ext)) {
            limit = DOC_MAX;
        } else {
            throw new BizException(ResultCode.PARAM_INVALID);
        }
        if (file.getSize() > limit) {
            throw new BizException(ResultCode.PARAM_INVALID);
        }
        // 按校验后的扩展名推断 content-type(不信客户端 file.getContentType(),防 text/html 存储型 XSS);
        // 未映射的(文档/压缩包)回退 octet-stream → 浏览器下载而非内联渲染
        String contentType = CONTENT_TYPES.getOrDefault(ext, "application/octet-stream");
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

    /** 确保桶存在(不存在则创建),并设为匿名只读(头像/图片需 &lt;img&gt; 直接访问;桶默认私有会 403) */
    private void ensureBucket() throws Exception {
        boolean exists = client.bucketExists(BucketExistsArgs.builder().bucket(props.bucket()).build());
        if (!exists) {
            client.makeBucket(MakeBucketArgs.builder().bucket(props.bucket()).build());
            log.info("MinIO 自动创建桶: {}", props.bucket());
        }
        // 设置匿名只读策略(幂等,每次启动设置);只读不可写,上传仍需密钥
        String policy = """
                {"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"AWS":["*"]},\
                "Action":["s3:GetObject"],"Resource":["arn:aws:s3:::%s/*"]}]}""".formatted(props.bucket());
        client.setBucketPolicy(SetBucketPolicyArgs.builder().bucket(props.bucket()).config(policy).build());
        log.info("MinIO 桶 {} 已设为匿名只读", props.bucket());
    }

    /**
     * 启动时把内置默认头像(classpath:default-avatars/avatar_*.png)seed 到 MinIO {@code avatars/} 前缀。
     * <p><b>差量 seed</b>:先列出 MinIO 已有头像,只上传本地有而 MinIO 缺的——
     * 平时启动差集为空(仅 1 次 list,快);<b>后续在 default-avatars/ 加新头像图、重启即自动只传新增的</b>
     * (无需手动清桶/全量重传)。MinIO 未就绪/无内置资源静默跳过,不阻断启动。
     */
    private void seedDefaultAvatars() {
        try {
            Resource[] resources = new PathMatchingResourcePatternResolver()
                    .getResources("classpath:default-avatars/avatar_*.png");
            if (resources.length == 0) {
                return; // 无内置头像资源(如 framework 单测环境),跳过
            }
            // 列出 MinIO 已有头像 key,只传缺失的(差量)
            Set<String> existing = new HashSet<>();
            for (var res : client.listObjects(ListObjectsArgs.builder()
                    .bucket(props.bucket()).prefix("avatars/").build())) {
                existing.add(res.get().objectName());
            }
            int n = 0;
            for (Resource r : resources) {
                String name = r.getFilename();
                if (name == null || existing.contains("avatars/" + name)) {
                    continue; // 已存在则跳过(差量)
                }
                try (InputStream in = r.getInputStream()) {
                    client.putObject(PutObjectArgs.builder()
                            .bucket(props.bucket())
                            .object("avatars/" + name)
                            .stream(in, r.contentLength(), -1)
                            .contentType("image/png")
                            .build());
                    n++;
                }
            }
            if (n > 0) {
                log.info("默认头像 seed 完成, 新增 count={}", n);
            }
        } catch (Exception e) {
            // seed 失败不阻断启动(资源缺失/MinIO 异常);下次启动重试
            log.warn("默认头像 seed 跳过/失败: {}", e.getMessage());
        }
    }

    /** 取小写扩展名(无则空串),用于白名单判类 */
    private static String ext(String originalName) {
        if (originalName == null) {
            return "";
        }
        int dot = originalName.lastIndexOf('.');
        return dot >= 0 ? originalName.substring(dot + 1).toLowerCase() : "";
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
