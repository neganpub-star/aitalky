package com.aitalky.ws.netty;

import io.netty.channel.ChannelInitializer;
import io.netty.channel.socket.SocketChannel;
import io.netty.handler.codec.http.HttpObjectAggregator;
import io.netty.handler.codec.http.HttpServerCodec;
import io.netty.handler.codec.http.websocketx.WebSocketServerProtocolHandler;
import io.netty.handler.stream.ChunkedWriteHandler;
import io.netty.handler.timeout.IdleStateHandler;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.concurrent.TimeUnit;

/**
 * Netty WS 流水线：HTTP 编解码 → 聚合 → 心跳空闲检测 → WS 协议握手 → 业务帧处理。
 */
@Component
public class WebSocketChannelInitializer extends ChannelInitializer<SocketChannel> {

    /** WS 路径 */
    private final String path;
    /** 读空闲秒数（超过则判定心跳丢失关闭） */
    private final int readerIdleSeconds;
    private final WebSocketFrameHandler frameHandler;

    public WebSocketChannelInitializer(@Value("${aitalky.ws.path:/ws}") String path,
                                       @Value("${aitalky.ws.reader-idle-seconds:60}") int readerIdleSeconds,
                                       WebSocketFrameHandler frameHandler) {
        this.path = path;
        this.readerIdleSeconds = readerIdleSeconds;
        this.frameHandler = frameHandler;
    }

    @Override
    protected void initChannel(SocketChannel ch) {
        ch.pipeline()
                .addLast(new HttpServerCodec())
                .addLast(new HttpObjectAggregator(64 * 1024))
                .addLast(new ChunkedWriteHandler())
                // 读空闲检测：客户端应周期性发 ping，超 readerIdleSeconds 无任何帧 → 触发 IdleStateEvent
                .addLast(new IdleStateHandler(readerIdleSeconds, 0, 0, TimeUnit.SECONDS))
                // 握手 + 自动处理 ping/pong/close 控制帧；保留握手参数（query token）
                .addLast(new WebSocketServerProtocolHandler(path, null, true))
                .addLast(frameHandler);
    }
}
