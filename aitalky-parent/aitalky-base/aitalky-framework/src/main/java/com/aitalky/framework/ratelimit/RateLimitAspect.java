package com.aitalky.framework.ratelimit;

import com.aitalky.common.api.ResultCode;
import com.aitalky.common.exception.BizException;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.redisson.api.RAtomicLong;
import org.redisson.api.RedissonClient;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.Duration;

/**
 * 限流切面:拦截 {@link RateLimit} 标注的方法,基于 Redisson 固定窗口计数实现限流。
 * <p><b>算法</b>:对限流 key 做原子自增 {@code INCR};当计数从 0 → 1(即窗口内首个请求)时设置过期时间,
 * 形成「固定时间窗口」;窗口内累计请求数超过 {@code count} 即拒绝。相比 RRateLimiter,INCR+EXPIRE
 * 更轻量、key 自动随窗口过期回收,适合登录/发码这类粗粒度防刷场景。
 * <p>仅 servlet web 入口加载(取客户端 IP 依赖请求上下文)。
 */
@Slf4j
@Aspect
@Component
@RequiredArgsConstructor
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
public class RateLimitAspect {

    private final RedissonClient redisson;
    private final RateLimitProperties props;

    @Around("@annotation(rateLimit)")
    public Object around(ProceedingJoinPoint pjp, RateLimit rateLimit) throws Throwable {
        String redisKey = buildKey(pjp, rateLimit);
        RAtomicLong counter = redisson.getAtomicLong(redisKey);
        long current = counter.incrementAndGet();
        // 窗口内首个请求:设置过期,窗口结束后计数自动清零
        if (current == 1L) {
            counter.expire(Duration.ofSeconds(rateLimit.period()));
        }
        if (current > rateLimit.count()) {
            log.warn("接口限流触发: key={}, 当前次数={}, 上限={}/{}s", redisKey, current,
                    rateLimit.count(), rateLimit.period());
            throw new BizException(ResultCode.RATE_LIMITED);
        }
        return pjp.proceed();
    }

    /** 构造限流 key:前缀(默认方法签名) + 可选 IP 维度,保证不同接口/来源互不干扰 */
    private String buildKey(ProceedingJoinPoint pjp, RateLimit rateLimit) {
        MethodSignature sig = (MethodSignature) pjp.getSignature();
        String prefix = rateLimit.key().isBlank()
                ? sig.getDeclaringType().getSimpleName() + "." + sig.getName()
                : rateLimit.key();
        StringBuilder sb = new StringBuilder("rate:limit:").append(prefix);
        if (rateLimit.byIp()) {
            sb.append(':').append(clientIp());
        }
        return sb.toString();
    }

    /**
     * 取客户端 IP。
     * <p><b>安全默认</b>:取 TCP 连接的 {@code remoteAddr},应用层不可伪造,杜绝攻击者用伪造
     * {@code X-Forwarded-For} 让每次请求算作不同 IP 从而绕过限流。
     * <p>仅当 {@code aitalky.rate-limit.trust-forward-headers=true}(部署在会覆盖 XFF 的可信反代之后)
     * 时,才采信 XFF 首个地址作为真实客户端 IP。
     */
    private String clientIp() {
        if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attrs) {
            HttpServletRequest req = attrs.getRequest();
            if (props.trustForwardHeaders()) {
                String xff = req.getHeader("X-Forwarded-For");
                if (xff != null && !xff.isBlank()) {
                    return xff.split(",")[0].trim();
                }
            }
            return req.getRemoteAddr();
        }
        return "unknown";
    }
}
