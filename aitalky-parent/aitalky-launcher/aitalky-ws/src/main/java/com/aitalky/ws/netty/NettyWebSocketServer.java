package com.aitalky.ws.netty;

import io.netty.bootstrap.ServerBootstrap;
import io.netty.channel.Channel;
import io.netty.channel.ChannelOption;
import io.netty.channel.EventLoopGroup;
import io.netty.channel.nio.NioEventLoopGroup;
import io.netty.channel.socket.nio.NioServerSocketChannel;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

/**
 * Netty WS 服务启动器（随 Spring 启动而启动，应用关闭时优雅停机）。
 * <p>横向扩展：每实例监听同一端口、各自持有连接；前端 LB（支持 WS）按连接分发，
 * 连接路由与推送经 Redis + RocketMQ 协调（见 ConnectionRegistry / PushService）。
 */
@Slf4j
@Component
public class NettyWebSocketServer implements ApplicationRunner {

    @Value("${aitalky.ws.port:9000}")
    private int port;

    private final WebSocketChannelInitializer channelInitializer;

    private EventLoopGroup bossGroup;
    private EventLoopGroup workerGroup;
    private Channel serverChannel;

    public NettyWebSocketServer(WebSocketChannelInitializer channelInitializer) {
        this.channelInitializer = channelInitializer;
    }

    @Override
    public void run(ApplicationArguments args) throws InterruptedException {
        bossGroup = new NioEventLoopGroup(1);
        workerGroup = new NioEventLoopGroup();
        ServerBootstrap bootstrap = new ServerBootstrap();
        bootstrap.group(bossGroup, workerGroup)
                .channel(NioServerSocketChannel.class)
                .option(ChannelOption.SO_BACKLOG, 1024)
                .childOption(ChannelOption.SO_KEEPALIVE, true)
                .childOption(ChannelOption.TCP_NODELAY, true)
                .childHandler(channelInitializer);
        serverChannel = bootstrap.bind(port).sync().channel();
        log.info("Netty WebSocket 网关启动成功，监听端口 {}", port);
    }

    @PreDestroy
    public void shutdown() {
        log.info("Netty WebSocket 网关停机中...");
        if (serverChannel != null) {
            serverChannel.close();
        }
        if (bossGroup != null) {
            bossGroup.shutdownGracefully();
        }
        if (workerGroup != null) {
            workerGroup.shutdownGracefully();
        }
    }
}
