package com.aitalky.framework.ratelimit;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * 接口限流注解:标注在 Controller 方法上,在 {@code period} 秒内最多允许 {@code count} 次访问,超限抛
 * {@link com.aitalky.common.api.ResultCode#RATE_LIMITED}。
 * <p>限流维度(Redis key)默认按「客户端 IP + 方法签名」隔离:不同接口、不同来源 IP 各自独立计数。
 * 若 {@link #byIp()} 置 false,则仅按方法签名做「全局总量」限流(与来源无关)。
 * <p>实现基于 Redisson 的 INCR + EXPIRE(首个请求设置过期,固定窗口计数),简单高效。
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface RateLimit {

    /** 限流 key 前缀(便于在 Redis 中归类、排查;同一前缀仍按 IP/方法进一步隔离) */
    String key() default "";

    /** 时间窗口内允许的最大请求次数 */
    int count();

    /** 时间窗口长度(秒) */
    int period();

    /** 是否按客户端 IP 维度限流(true:每 IP 独立计数;false:按方法全局限流) */
    boolean byIp() default true;
}
