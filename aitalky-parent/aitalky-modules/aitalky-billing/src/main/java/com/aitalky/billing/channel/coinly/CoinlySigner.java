package com.aitalky.billing.channel.coinly;

import com.aitalky.common.util.DigestUtil;

import java.util.Map;
import java.util.TreeMap;

/**
 * Coinly 签名(官方文档约定)。建址与回调验签共用同一规则。
 * <p>规则:排除 sign 和空值 → 参数按 key 字典序升序 → 拼成 {@code key1value1key2value2}(无分隔符)
 * → apiKey 前置拼到最前 → MD5 转小写。
 */
public final class CoinlySigner {

    private CoinlySigner() {
    }

    /**
     * 计算签名。
     *
     * @param params 业务参数(含公共参数 pid/nonce/timestamp，不含 sign)
     * @param apiKey 渠道 apiKey(前置拼接，不作为参数参与排序)
     */
    public static String sign(Map<String, ?> params, String apiKey) {
        // TreeMap 自然序=key 字典序升序
        TreeMap<String, Object> sorted = new TreeMap<>();
        for (Map.Entry<String, ?> e : params.entrySet()) {
            if ("sign".equals(e.getKey())) {
                continue;
            }
            Object v = e.getValue();
            // 排除空值(null / 空串)
            if (v == null) {
                continue;
            }
            String s = String.valueOf(v);
            if (s.isEmpty()) {
                continue;
            }
            sorted.put(e.getKey(), s);
        }
        StringBuilder sb = new StringBuilder(apiKey);
        sorted.forEach((k, v) -> sb.append(k).append(v));
        return DigestUtil.md5Hex(sb.toString());
    }

    /** 回调验签:重算签名与回调携带的 sign 比对 */
    public static boolean verify(Map<String, ?> params, String apiKey, String sign) {
        if (sign == null || sign.isBlank()) {
            return false;
        }
        return sign.equalsIgnoreCase(sign(params, apiKey));
    }
}
