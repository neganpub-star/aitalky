package com.aitalky.common.id;

/**
 * 雪花算法 ID 生成器（线程安全）。
 * <p>64 位：1 符号位 + 41 时间戳(ms) + 10 机器位(datacenter 5 + worker 5) + 12 序列。
 * <p>多实例横向扩展时，每个实例必须分配不同的 (datacenterId, workerId)，避免 ID 冲突。
 */
public class SnowflakeIdGenerator {

    /** 起始纪元（2024-01-01 00:00:00 UTC），可用约 69 年 */
    private static final long EPOCH = 1704067200000L;

    private static final long WORKER_ID_BITS = 5L;
    private static final long DATACENTER_ID_BITS = 5L;
    private static final long SEQUENCE_BITS = 12L;

    private static final long MAX_WORKER_ID = ~(-1L << WORKER_ID_BITS);          // 31
    private static final long MAX_DATACENTER_ID = ~(-1L << DATACENTER_ID_BITS);  // 31
    private static final long SEQUENCE_MASK = ~(-1L << SEQUENCE_BITS);           // 4095

    private static final long WORKER_ID_SHIFT = SEQUENCE_BITS;
    private static final long DATACENTER_ID_SHIFT = SEQUENCE_BITS + WORKER_ID_BITS;
    private static final long TIMESTAMP_SHIFT = SEQUENCE_BITS + WORKER_ID_BITS + DATACENTER_ID_BITS;

    private final long workerId;
    private final long datacenterId;

    private long sequence = 0L;
    private long lastTimestamp = -1L;

    public SnowflakeIdGenerator(long datacenterId, long workerId) {
        if (workerId > MAX_WORKER_ID || workerId < 0) {
            throw new IllegalArgumentException("workerId 必须在 [0, " + MAX_WORKER_ID + "] 之间");
        }
        if (datacenterId > MAX_DATACENTER_ID || datacenterId < 0) {
            throw new IllegalArgumentException("datacenterId 必须在 [0, " + MAX_DATACENTER_ID + "] 之间");
        }
        this.workerId = workerId;
        this.datacenterId = datacenterId;
    }

    /** 生成下一个全局唯一 ID */
    public synchronized long nextId() {
        long timestamp = System.currentTimeMillis();
        if (timestamp < lastTimestamp) {
            // 时钟回拨：直接抛出，避免生成重复 ID
            throw new IllegalStateException("时钟回拨，拒绝生成 ID，回拨毫秒数=" + (lastTimestamp - timestamp));
        }
        if (timestamp == lastTimestamp) {
            sequence = (sequence + 1) & SEQUENCE_MASK;
            if (sequence == 0) {
                // 当前毫秒序列用尽，自旋到下一毫秒
                timestamp = tilNextMillis(lastTimestamp);
            }
        } else {
            sequence = 0L;
        }
        lastTimestamp = timestamp;
        return ((timestamp - EPOCH) << TIMESTAMP_SHIFT)
                | (datacenterId << DATACENTER_ID_SHIFT)
                | (workerId << WORKER_ID_SHIFT)
                | sequence;
    }

    private long tilNextMillis(long lastTimestamp) {
        long timestamp = System.currentTimeMillis();
        while (timestamp <= lastTimestamp) {
            timestamp = System.currentTimeMillis();
        }
        return timestamp;
    }
}
