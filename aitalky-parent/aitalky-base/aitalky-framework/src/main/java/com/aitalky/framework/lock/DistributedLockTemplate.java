package com.aitalky.framework.lock;

import com.aitalky.common.api.ResultCode;
import com.aitalky.common.exception.BizException;
import lombok.extern.slf4j.Slf4j;
import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;
import org.springframework.stereotype.Component;

import java.util.concurrent.TimeUnit;
import java.util.function.Supplier;

/**
 * 分布式锁模板（Redisson）。
 * <p>多实例横向扩展下保证临界区互斥：会话分配（一会话只分一坐席、不超承载量）、
 * 订单/支付回调幂等、计数等。
 */
@Slf4j
@Component
public class DistributedLockTemplate {

    private final RedissonClient redissonClient;

    public DistributedLockTemplate(RedissonClient redissonClient) {
        this.redissonClient = redissonClient;
    }

    /**
     * 加锁执行（拿不到锁抛业务异常）。
     *
     * @param key       锁 key
     * @param waitSec   最大等待时间（秒）
     * @param leaseSec  持锁时间（秒，看门狗自动续期可传 -1）
     * @param action    临界区逻辑
     */
    public <T> T execute(String key, long waitSec, long leaseSec, Supplier<T> action) {
        RLock lock = redissonClient.getLock(key);
        boolean locked = false;
        try {
            locked = lock.tryLock(waitSec, leaseSec, TimeUnit.SECONDS);
            if (!locked) {
                log.warn("获取分布式锁失败, key={}", key);
                throw new BizException(ResultCode.SYSTEM_ERROR);
            }
            return action.get();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new BizException(ResultCode.SYSTEM_ERROR);
        } finally {
            if (locked && lock.isHeldByCurrentThread()) {
                lock.unlock();
            }
        }
    }

    public void execute(String key, long waitSec, long leaseSec, Runnable action) {
        execute(key, waitSec, leaseSec, () -> {
            action.run();
            return null;
        });
    }
}
