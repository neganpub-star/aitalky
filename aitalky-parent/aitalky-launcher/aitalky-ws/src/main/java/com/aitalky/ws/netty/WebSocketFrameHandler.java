package com.aitalky.ws.netty;

import com.aitalky.common.id.SnowflakeIdGenerator;
import com.aitalky.ws.push.PushService;
import com.aitalky.ws.registry.ConnectionRegistry;
import io.jsonwebtoken.Claims;
import io.netty.channel.ChannelHandler;
import io.netty.channel.ChannelHandlerContext;
import io.netty.channel.SimpleChannelInboundHandler;
import io.netty.handler.codec.http.QueryStringDecoder;
import io.netty.handler.codec.http.websocketx.TextWebSocketFrame;
import io.netty.handler.codec.http.websocketx.WebSocketServerProtocolHandler;
import io.netty.handler.timeout.IdleStateEvent;
import com.aitalky.framework.security.JwtUtil;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * WS 业务帧处理器（@Sharable，单实例共享，状态绑在 Channel 上）。
 * <ul>
 *   <li>握手完成 → 解析 URL token 得到身份（member:{id} / cust:{id}）→ {@link ConnectionRegistry#register} 登记多端连接</li>
 *   <li>心跳 → IdleStateEvent 触发；超时未收任何帧则关闭，收到 {"type":"ping"} 回 {"type":"pong"}</li>
 *   <li>会话订阅 → {"type":"subscribe","conversationId":x} 加入会话订阅集合（代看/代发推送目标）</li>
 *   <li>断开 → 注销，刷新在线引用计数</li>
 * </ul>
 */
@Slf4j
@Component
@ChannelHandler.Sharable
public class WebSocketFrameHandler extends SimpleChannelInboundHandler<TextWebSocketFrame> {

    private final JwtUtil jwtUtil;
    private final ConnectionRegistry registry;
    private final SnowflakeIdGenerator idGenerator;
    private final PushService pushService;

    public WebSocketFrameHandler(JwtUtil jwtUtil, ConnectionRegistry registry,
                                 SnowflakeIdGenerator idGenerator, PushService pushService) {
        this.jwtUtil = jwtUtil;
        this.registry = registry;
        this.idGenerator = idGenerator;
        this.pushService = pushService;
    }

    @Override
    public void userEventTriggered(ChannelHandlerContext ctx, Object evt) throws Exception {
        if (evt instanceof WebSocketServerProtocolHandler.HandshakeComplete handshake) {
            // 从 URL query 取 token：ws://host/ws?token=xxx（坐席）或 ?appId=&userId=（信使客户，此处简化）
            String identity = resolveIdentity(handshake.requestUri());
            if (identity == null) {
                log.warn("WS 握手鉴权失败，关闭连接 uri={}", handshake.requestUri());
                ctx.close();
                return;
            }
            String connId = String.valueOf(idGenerator.nextId());
            registry.register(connId, identity, ctx.channel());
            ctx.writeAndFlush(new TextWebSocketFrame("{\"type\":\"connected\",\"connId\":\"" + connId + "\"}"));
        } else if (evt instanceof IdleStateEvent) {
            // 读空闲超时：客户端掉线，主动关闭释放连接
            log.debug("WS 读空闲超时，关闭连接");
            ctx.close();
        } else {
            super.userEventTriggered(ctx, evt);
        }
    }

    @Override
    protected void channelRead0(ChannelHandlerContext ctx, TextWebSocketFrame frame) {
        String text = frame.text();
        // 心跳
        if (text.contains("\"type\":\"ping\"")) {
            ctx.writeAndFlush(new TextWebSocketFrame("{\"type\":\"pong\"}"));
            return;
        }
        // 会话订阅/退订（仅示意解析；正式用 JSON 反序列化 + 权限校验）
        String connId = ctx.channel().attr(ConnectionRegistry.ATTR_CONN_ID).get();
        if (text.contains("\"type\":\"subscribe\"")) {
            String cid = extract(text, "conversationId");
            if (cid != null) {
                registry.subscribe(cid, connId);
            }
        } else if (text.contains("\"type\":\"unsubscribe\"")) {
            String cid = extract(text, "conversationId");
            if (cid != null) {
                registry.unsubscribe(cid, connId);
            }
        }
    }

    @Override
    public void channelInactive(ChannelHandlerContext ctx) {
        registry.unregister(ctx.channel());
    }

    @Override
    public void exceptionCaught(ChannelHandlerContext ctx, Throwable cause) {
        log.warn("WS 连接异常: {}", cause.getMessage());
        ctx.close();
    }

    /** 解析身份:坐席项目级令牌→member:{id};客户令牌(scope=customer)→cust:{customerId} */
    private String resolveIdentity(String uri) {
        Map<String, List<String>> params = new QueryStringDecoder(uri).parameters();
        List<String> tokens = params.get("token");
        if (tokens == null || tokens.isEmpty()) {
            return null;
        }
        try {
            Claims claims = jwtUtil.parse(tokens.get(0));
            if ("customer".equals(claims.get("scope"))) {
                return "cust:" + claims.get("customerId");
            }
            Object memberId = claims.get("memberId");
            return memberId != null ? "member:" + memberId : null; // 账号级令牌(未进项目)不允许连 WS
        } catch (Exception e) {
            return null;
        }
    }

    private String extract(String json, String field) {
        String key = "\"" + field + "\"";
        int i = json.indexOf(key);
        if (i < 0) {
            return null;
        }
        int colon = json.indexOf(':', i + key.length());
        if (colon < 0) {
            return null;
        }
        int start = colon + 1;
        while (start < json.length() && (json.charAt(start) == ' ' || json.charAt(start) == '"')) {
            start++;
        }
        int end = start;
        while (end < json.length() && "0123456789".indexOf(json.charAt(end)) >= 0) {
            end++;
        }
        return end > start ? json.substring(start, end) : null;
    }
}
