package com.aitalky.framework.storage;

import org.springframework.stereotype.Service;

/**
 * 默认头像池:把客户/成员 id 稳定映射到一张内置 Memoji 头像(MinIO {@code avatars/avatar_N.png})。
 * <p>头像图(168 张,alohe/memojis MIT)随 app jar 在 {@code resources/default-avatars/},
 * 由 {@link MinioService} 启动时 seed 到 MinIO;此处只负责按 id 取模拼 URL,不依赖 MinioClient,
 * 故所有入口(app/admin/ws)均可装配。去掉了原 DiceBear 外网依赖。
 */
@Service
public class AvatarPool {

    /** 默认头像数量(= resources/default-avatars/avatar_0..N-1.png);增减图需同步此值 */
    public static final int COUNT = 168;

    private final MinioProperties props;

    public AvatarPool(MinioProperties props) {
        this.props = props;
    }

    /**
     * 按 seed(客户/成员 id)稳定取一张默认头像 URL:同 id 恒定、不同 id 分散到 168 张。
     * 拼接同 MinioService:{@code endpoint/bucket/avatars/avatar_{idx}.png}。
     */
    public String urlFor(long seed) {
        int idx = Math.floorMod(seed, COUNT);
        String ep = props.endpoint() == null ? "" : props.endpoint();
        String base = ep.endsWith("/") ? ep.substring(0, ep.length() - 1) : ep;
        return base + "/" + props.bucket() + "/avatars/avatar_" + idx + ".png";
    }
}
