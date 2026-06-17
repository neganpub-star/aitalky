package com.aitalky.framework.security;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;

/**
 * HMAC-SHA256 行级签名(防改库)。
 * <p>对订单/余额/流水的关键字段拼接后签名存 sign 列;读出时重算比对，
 * 直接改数据库金额而不知道密钥的攻击会因签名不符被发现。
 * <p>密钥来自配置(与数据库分离存放)。输出小写十六进制。
 */
public final class HmacUtil {

    private static final String ALGORITHM = "HmacSHA256";

    private HmacUtil() {
    }

    /** HMAC-SHA256 小写十六进制 */
    public static String hmacSha256Hex(String key, String data) {
        try {
            Mac mac = Mac.getInstance(ALGORITHM);
            mac.init(new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), ALGORITHM));
            byte[] bytes = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(bytes.length * 2);
            for (byte b : bytes) {
                sb.append(Character.forDigit((b >> 4) & 0xF, 16));
                sb.append(Character.forDigit(b & 0xF, 16));
            }
            return sb.toString();
        } catch (Exception e) {
            throw new IllegalStateException("HMAC-SHA256 计算失败", e);
        }
    }

    /** 常量时间比较，避免计时侧信道泄露 */
    public static boolean verify(String key, String data, String expectedHex) {
        String actual = hmacSha256Hex(key, data);
        return constantTimeEquals(actual, expectedHex);
    }

    private static boolean constantTimeEquals(String a, String b) {
        if (a == null || b == null || a.length() != b.length()) {
            return false;
        }
        int result = 0;
        for (int i = 0; i < a.length(); i++) {
            result |= a.charAt(i) ^ b.charAt(i);
        }
        return result == 0;
    }
}
