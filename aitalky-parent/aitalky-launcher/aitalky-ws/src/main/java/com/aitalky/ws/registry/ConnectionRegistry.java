package com.aitalky.ws.registry;

import io.netty.channel.Channel;
import io.netty.util.AttributeKey;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.redisson.api.RSet;
import org.redisson.api.RedissonClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

/**
 * WS 连接注册表（多端推送 + 横向扩展的核心）。
 * <p><b>本地</b>：connId → Channel（只持有落在本实例的连接）。
 * <p><b>Redis</b>：
 * <ul>
 *   <li>{@code ws:conn:member:{memberId}} = Set&lt;实例#connId&gt;——一个成员的<strong>全部</strong>连接（多标签/Web+App）。</li>
 *   <li>{@code ws:conn:cust:{customerId}} = 同上（客户多端）。</li>
 *   <li>{@code ws:conn:project:{pid}} = 同上（坐席项目频道，收未分配新会话广播）。</li>
 *   <li>{@code ws:sub:{conversationId}} = Set&lt;实例#connId&gt;——正在查看该会话的连接（代看/代发推送目标）。</li>
 *   <li>{@code ws:route:{实例#connId}} = 实例ID,<b>带 TTL</b>——连接活性标记(心跳续期);过期=连接已死。</li>
 * </ul>
 * <p><b>在线状态</b>=成员连接 Set 是否非空（<strong>引用计数</strong>，最后一条断开才离线）；
 * <b>不做单点登录顶号</b>——允许多端并存，推送给全部连接（取代 cicada 单点登录的串窗口/漏推）。
 * <p><b>僵尸连接治理</b>(避免 Set 越堆越大 / isOnline 误判)：
 * <ul>
 *   <li><b>优雅断开</b>:channelInactive → {@link #unregister} 即时清理(含 IdleStateHandler 超时关连接)。</li>
 *   <li><b>进程重启</b>:旧连接全死但 unregister 没机会跑 → {@link #purgeInstanceNodes()} 启动时清本实例残留。</li>
 *   <li><b>异常崩溃(kill -9)</b>:route 键 TTL 到期 → {@link #reconcile()} 定时对账剔除集合里的过期节点。</li>
 * </ul>
 */
@Slf4j
@Component
public class ConnectionRegistry {

    /** Channel 上绑定的元数据 key */
    public static final AttributeKey<String> ATTR_CONN_ID = AttributeKey.valueOf("connId");
    public static final AttributeKey<String> ATTR_IDENTITY = AttributeKey.valueOf("identity"); // member:{id} / cust:{id}
    public static final AttributeKey<String> ATTR_CHANNEL = AttributeKey.valueOf("channel"); // 附加频道 project:{id}(坐席收未分配广播)

    /** 连接活性 TTL(秒):大于"读空闲 60s + 心跳 25s"留足容错(丢 ~2 个心跳仍判活);心跳每次续期 */
    private static final long LIVENESS_TTL_SECONDS = 90;

    /** 本实例 ID（横向扩展时每实例唯一，配置注入） */
    private final String instanceId;
    private final RedissonClient redisson;

    /** 本地连接表：connId -> Channel */
    private final Map<String, Channel> localChannels = new ConcurrentHashMap<>();

    public ConnectionRegistry(RedissonClient redisson,
                              @Value("${aitalky.ws.instance-id:ws-0}") String instanceId) {
        this.redisson = redisson;
        this.instanceId = instanceId;
    }

    /**
     * 启动清理:进程重启后,本实例此前的所有连接必定已死(JVM 退出,unregister 没机会跑),
     * 但它们在 Redis 各集合里的节点(实例前缀=本实例)仍残留。在 Netty 绑定端口接受新连接<b>之前</b>
     * (@PostConstruct 早于 ApplicationRunner)清掉这些残留,避免 Set 永久膨胀 / isOnline 误判。
     */
    @PostConstruct
    public void purgeInstanceNodes() {
        String prefix = instanceId + "#";
        long removed = 0;
        // 清各连接/订阅集合里属于本实例的节点
        for (String key : redisson.getKeys().getKeysByPattern("ws:conn:*")) {
            removed += pruneNodes(redisson.getSet(key), n -> n.startsWith(prefix));
        }
        for (String key : redisson.getKeys().getKeysByPattern("ws:sub:*")) {
            removed += pruneNodes(redisson.getSet(key), n -> n.startsWith(prefix));
        }
        // 清本实例的 route 活性键(无 TTL 的历史残留 + 仍存活的过期前残留)
        long routes = 0;
        for (String key : redisson.getKeys().getKeysByPattern("ws:route:" + prefix + "*")) {
            redisson.getBucket(key).delete();
            routes++;
        }
        log.info("WS 启动清理残留连接节点 instance={}, 清理集合成员={}, route键={}", instanceId, removed, routes);
    }

    /**
     * 定时对账(每 60s):剔除集合里"route 活性键已过期"的本实例节点——
     * 覆盖 kill -9/崩溃等 unregister 没跑、且本实例仍存活的场景。只动本实例节点,跨实例各管各的。
     */
    @Scheduled(fixedDelay = 60, timeUnit = TimeUnit.SECONDS)
    public void reconcile() {
        String prefix = instanceId + "#";
        long removed = 0;
        for (String key : redisson.getKeys().getKeysByPattern("ws:conn:*")) {
            removed += pruneNodes(redisson.getSet(key), this::isDeadLocalNode);
        }
        for (String key : redisson.getKeys().getKeysByPattern("ws:sub:*")) {
            removed += pruneNodes(redisson.getSet(key), this::isDeadLocalNode);
        }
        if (removed > 0) {
            log.info("WS 定时对账剔除过期僵尸节点 instance={}, 数量={}", instanceId, removed);
        }
    }

    /** 本实例节点且 route 活性键已过期 → 判定为死(其它实例节点不归本实例对账) */
    private boolean isDeadLocalNode(String node) {
        return node.startsWith(instanceId + "#") && !redisson.getBucket(routeKey(node)).isExists();
    }

    /** 从集合中移除命中谓词的节点,返回移除数(批量 removeAll,避免逐个往返) */
    private long pruneNodes(RSet<String> set, java.util.function.Predicate<String> dead) {
        Set<String> toRemove = set.readAll().stream().filter(dead).collect(Collectors.toSet());
        if (toRemove.isEmpty()) {
            return 0;
        }
        set.removeAll(toRemove);
        return toRemove.size();
    }

    /** 连接建立：登记本地 + Redis（成员/客户的连接集合 + 带 TTL 的活性路由） */
    public void register(String connId, String identity, Channel channel) {
        localChannels.put(connId, channel);
        channel.attr(ATTR_CONN_ID).set(connId);
        channel.attr(ATTR_IDENTITY).set(identity);
        String node = node(connId);
        connSet(identity).add(node);
        touch(node);
        log.info("WS 连接建立 identity={}, connId={}, 当前该身份在线连接数={}", identity, connId, connSet(identity).size());
    }

    /** 加入附加频道(如 project:{id});连接断开时一并清理 */
    public void joinChannel(String connId, String channelKey, Channel channel) {
        connSet(channelKey).add(node(connId));
        channel.attr(ATTR_CHANNEL).set(channelKey);
    }

    /** 心跳续期(收到客户端 ping 时调):刷新本连接 route 活性键 TTL,使其不被对账剔除 */
    public void heartbeat(String connId) {
        if (connId != null) {
            touch(node(connId));
        }
    }

    /** 连接断开：清理本地 + Redis；订阅关系一并清掉 */
    public void unregister(Channel channel) {
        String connId = channel.attr(ATTR_CONN_ID).get();
        String identity = channel.attr(ATTR_IDENTITY).get();
        String channelKey = channel.attr(ATTR_CHANNEL).get();
        if (connId == null) {
            return;
        }
        localChannels.remove(connId);
        String node = node(connId);
        if (identity != null) {
            connSet(identity).remove(node);
        }
        if (channelKey != null) {
            connSet(channelKey).remove(node);
        }
        redisson.getBucket(routeKey(node)).delete();
        log.info("WS 连接断开 identity={}, connId={}, 剩余在线连接数={}",
                identity, connId, identity == null ? 0 : connSet(identity).size());
    }

    /** 客户端打开某会话 → 订阅（代看/代发推送目标来源） */
    public void subscribe(String conversationId, String connId) {
        subSet(conversationId).add(node(connId));
    }

    /** 关闭会话 → 退订 */
    public void unsubscribe(String conversationId, String connId) {
        subSet(conversationId).remove(node(connId));
    }

    /** 取某身份的全部连接节点（实例#connId），跨实例推送时据此分发 */
    public Set<String> connectionsOf(String identity) {
        return connSet(identity).readAll();
    }

    /** 取某会话的全部订阅连接节点 */
    public Set<String> subscribersOf(String conversationId) {
        return subSet(conversationId).readAll();
    }

    /** 在线状态（引用计数）：该成员/客户是否还有连接 */
    public boolean isOnline(String identity) {
        return !connSet(identity).isEmpty();
    }

    /** 本地直推（节点属于本实例时调用） */
    public Channel localChannel(String connId) {
        return localChannels.get(connId);
    }

    public String getInstanceId() {
        return instanceId;
    }

    public String node(String connId) {
        return instanceId + "#" + connId;
    }

    /** 写/续期连接活性键(带 TTL);心跳与建连共用 */
    private void touch(String node) {
        redisson.getBucket(routeKey(node)).set(instanceId, Duration.ofSeconds(LIVENESS_TTL_SECONDS));
    }

    // ===== Redis key =====
    private RSet<String> connSet(String identity) {
        return redisson.getSet("ws:conn:" + identity);
    }

    private RSet<String> subSet(String conversationId) {
        return redisson.getSet("ws:sub:" + conversationId);
    }

    private String routeKey(String node) {
        return "ws:route:" + node;
    }
}
