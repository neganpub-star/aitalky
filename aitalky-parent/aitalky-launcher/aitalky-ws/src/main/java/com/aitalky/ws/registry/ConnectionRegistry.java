package com.aitalky.ws.registry;

import io.netty.channel.Channel;
import io.netty.util.AttributeKey;
import lombok.extern.slf4j.Slf4j;
import org.redisson.api.RSet;
import org.redisson.api.RedissonClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * WS 连接注册表（多端推送 + 横向扩展的核心）。
 * <p><b>本地</b>：connId → Channel（只持有落在本实例的连接）。
 * <p><b>Redis</b>：
 * <ul>
 *   <li>{@code ws:conn:member:{memberId}} = Set&lt;实例#connId&gt;——一个成员的<strong>全部</strong>连接（多标签/Web+App）。</li>
 *   <li>{@code ws:conn:cust:{customerId}} = 同上（客户多端）。</li>
 *   <li>{@code ws:sub:{conversationId}} = Set&lt;实例#connId&gt;——正在查看该会话的连接（代看/代发推送目标）。</li>
 *   <li>{@code ws:route:{实例#connId}} = 实例ID——连接所在实例（跨实例推送时定位）。</li>
 * </ul>
 * <p><b>在线状态</b>=成员连接 Set 是否非空（<strong>引用计数</strong>，最后一条断开才离线）；
 * <b>不做单点登录顶号</b>——允许多端并存，推送给全部连接（取代 cicada 单点登录的串窗口/漏推）。
 */
@Slf4j
@Component
public class ConnectionRegistry {

    /** Channel 上绑定的元数据 key */
    public static final AttributeKey<String> ATTR_CONN_ID = AttributeKey.valueOf("connId");
    public static final AttributeKey<String> ATTR_IDENTITY = AttributeKey.valueOf("identity"); // member:{id} / cust:{id}

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

    /** 连接建立：登记本地 + Redis（成员/客户的连接集合 + 路由） */
    public void register(String connId, String identity, Channel channel) {
        localChannels.put(connId, channel);
        channel.attr(ATTR_CONN_ID).set(connId);
        channel.attr(ATTR_IDENTITY).set(identity);
        String node = node(connId);
        connSet(identity).add(node);
        redisson.getBucket(routeKey(node)).set(instanceId);
        log.info("WS 连接建立 identity={}, connId={}, 当前该身份在线连接数={}", identity, connId, connSet(identity).size());
    }

    /** 连接断开：清理本地 + Redis；订阅关系一并清掉 */
    public void unregister(Channel channel) {
        String connId = channel.attr(ATTR_CONN_ID).get();
        String identity = channel.attr(ATTR_IDENTITY).get();
        if (connId == null) {
            return;
        }
        localChannels.remove(connId);
        String node = node(connId);
        if (identity != null) {
            connSet(identity).remove(node);
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
