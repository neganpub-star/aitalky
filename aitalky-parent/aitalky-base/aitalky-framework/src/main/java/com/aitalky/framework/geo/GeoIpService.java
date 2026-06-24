package com.aitalky.framework.geo;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.redisson.api.RBucket;
import org.redisson.api.RedissonClient;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.LinkedHashSet;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.function.Consumer;

/**
 * IP 归属地解析:把客户接入 IP 解析成中文「国家+省/州+城市」(详情面板「所在地」)。
 * <p><b>不阻塞主流程</b>:{@link #resolveAsync} 提交到自带守护线程池异步解析,解析成功才回调写库;
 * 失败静默不影响接入。同 IP 结果缓存(含失败负缓存)防重复打外部 API 触发限速。
 * <p>私网/本地/非法 IP 直接跳过(开发期 127.0.0.1、内网 192.168.* 等无归属地)。
 */
@Slf4j
@Service
public class GeoIpService {

    private final RedissonClient redisson;
    private final GeoIpProperties props;
    /** 自用 ObjectMapper(仅解析 ip-api 响应):不注入 Spring 的,避免非 web 入口(ws/Netty)无该 bean 致启动失败 */
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient http;
    /** 自带守护线程池:不依赖全局 @EnableAsync,避免污染其他模块;池小即可(新会话才解析,量不大) */
    private final ExecutorService pool;

    public GeoIpService(RedissonClient redisson, GeoIpProperties props) {
        this.redisson = redisson;
        this.props = props;
        this.http = HttpClient.newBuilder()
                .connectTimeout(Duration.ofMillis(props.timeoutMs()))
                .build();
        this.pool = Executors.newFixedThreadPool(2, r -> {
            Thread t = new Thread(r, "geoip-resolver");
            t.setDaemon(true);
            return t;
        });
    }

    /**
     * 异步解析 IP 归属地;解析出非空结果才执行回调(通常用于写回会话 location)。
     * 关闭/私网 IP/解析失败均静默跳过。
     */
    public void resolveAsync(String ip, Consumer<String> onResolved) {
        if (!props.enabled()) {
            return;
        }
        String target = effectiveIp(ip); // 私网/回环遇开发回退 IP 时替换;否则 null 跳过
        if (target == null) {
            return;
        }
        pool.execute(() -> {
            try {
                resolve(target).ifPresent(onResolved);
            } catch (Exception e) {
                // 归属地解析失败不影响业务,仅告警
                log.warn("IP 归属地解析失败 ip={}, 原因={}", target, e.getMessage());
            }
        });
    }

    /**
     * 实际用于解析的 IP:公网原样返回;私网/回环时——配了开发回退 IP(dev-fallback-ip)则用它
     * (本地也能看到所在地效果),否则返回 null(跳过解析)。生产 dev-fallback-ip 留空即恒跳过私网。
     */
    private String effectiveIp(String ip) {
        if (isPublicIp(ip)) {
            return ip;
        }
        String fb = props.devFallbackIp();
        return (fb != null && !fb.isBlank() && isPublicIp(fb.trim())) ? fb.trim() : null;
    }

    /**
     * 同步解析 IP 归属地(中文「国家+省/州+城市」)。优先读缓存;未命中调外部 API 并写缓存。
     * 私网/解析失败返回 empty。
     */
    public Optional<String> resolve(String ip) {
        if (!props.enabled() || !isPublicIp(ip)) {
            return Optional.empty();
        }
        RBucket<String> cache = redisson.getBucket(cacheKey(ip));
        String cached = cache.get();
        if (cached != null) {                       // 命中缓存(空串=负缓存:之前解析失败,直接返回 empty)
            return cached.isEmpty() ? Optional.empty() : Optional.of(cached);
        }
        String location = queryByProvider(ip);
        // 负缓存也写(空串),避免同一无法解析的 IP 反复打 API
        cache.set(location == null ? "" : location, props.cacheDays(), TimeUnit.DAYS);
        return Optional.ofNullable(location).filter(StringUtils::hasText);
    }

    /** 按 provider 分发;当前仅 ipapi,预留 maxmind */
    private String queryByProvider(String ip) {
        return switch (props.provider()) {
            case "ipapi" -> queryIpApi(ip);
            default -> {
                log.warn("未知 geoip provider={},跳过解析", props.provider());
                yield null;
            }
        };
    }

    /**
     * 调 ip-api.com:GET {base}{ip}?lang={lang}&fields=status,country,regionName,city。
     * 成功按语言风格拼接(见 {@link #format}):英文「圣克拉拉, 加州, 美国」逗号分隔由小到大,
     * 中文「美国加州圣克拉拉」无分隔由大到小;相邻重复段去重(如直辖市 省=市 只留一个)。
     */
    private String queryIpApi(String ip) {
        try {
            String url = props.apiBaseUrl() + ip + "?lang=" + props.lang()
                    + "&fields=status,country,regionName,city";
            HttpRequest req = HttpRequest.newBuilder(URI.create(url))
                    .timeout(Duration.ofMillis(props.timeoutMs()))
                    .GET()
                    .build();
            HttpResponse<String> resp = http.send(req, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (resp.statusCode() != 200) {
                return null;
            }
            JsonNode node = objectMapper.readTree(resp.body());
            if (!"success".equals(node.path("status").asText())) {
                return null;   // 私网/保留地址/查询失败,ip-api 返回 status=fail
            }
            return format(node.path("country").asText(null),
                    node.path("regionName").asText(null), node.path("city").asText(null));
        } catch (Exception e) {
            log.warn("ip-api 解析异常 ip={}, 原因={}", ip, e.getMessage());
            return null;
        }
    }

    /**
     * 按当前 lang 的书写习惯拼接归属地:
     * <ul>
     *   <li>CJK(zh / ja):由大到小「国家+省/州+城市」无分隔,如「美国加州圣克拉拉」;</li>
     *   <li>其它(en 等):由小到大「城市, 州, 国家」逗号分隔,如「Santa Clara, California, United States」。</li>
     * </ul>
     * LinkedHashSet 保序去完全相同段(直辖市/城邦 省=市 只留一个)。全空返回 null。
     */
    private String format(String country, String region, String city) {
        String lang = props.lang().toLowerCase();
        boolean cjk = lang.startsWith("zh") || lang.startsWith("ja");
        Set<String> parts = new LinkedHashSet<>();
        if (cjk) {
            addIfText(parts, country);
            addIfText(parts, region);
            addIfText(parts, city);
        } else {
            addIfText(parts, city);
            addIfText(parts, region);
            addIfText(parts, country);
        }
        String loc = String.join(cjk ? "" : ", ", parts);
        return StringUtils.hasText(loc) ? loc : null;
    }

    private void addIfText(Set<String> set, String s) {
        if (StringUtils.hasText(s)) {
            set.add(s.trim());
        }
    }

    private String cacheKey(String ip) {
        return "geo:ip:" + ip;
    }

    /**
     * 是否公网可解析 IP:排除空/本地回环/私有网段/链路本地。这些无归属地,跳过解析免打 API。
     * 简单前缀判断即可(XFF 首段通常为 IPv4)。
     */
    private boolean isPublicIp(String ip) {
        if (!StringUtils.hasText(ip)) {
            return false;
        }
        String s = ip.trim();
        if (s.equals("localhost") || s.equals("127.0.0.1") || s.equals("::1") || s.equals("0:0:0:0:0:0:0:1")) {
            return false;
        }
        // IPv4 私有/保留段
        if (s.startsWith("127.") || s.startsWith("10.") || s.startsWith("192.168.")
                || s.startsWith("169.254.") || s.startsWith("100.64.")) {
            return false;
        }
        // 172.16.0.0 ~ 172.31.255.255
        if (s.startsWith("172.")) {
            int second = secondOctet(s);
            if (second >= 16 && second <= 31) {
                return false;
            }
        }
        // IPv6 本地/唯一本地地址(fe80::/fc00::/fd00::)
        String lower = s.toLowerCase();
        return !lower.startsWith("fe80:") && !lower.startsWith("fc") && !lower.startsWith("fd");
    }

    /** 取 IPv4 第二段(用于 172.16-31 私有段判断),解析失败返回 -1 */
    private int secondOctet(String ipv4) {
        String[] seg = ipv4.split("\\.");
        if (seg.length < 2) {
            return -1;
        }
        try {
            return Integer.parseInt(seg[1]);
        } catch (NumberFormatException e) {
            return -1;
        }
    }
}
