package com.aitalky.common.util;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

/**
 * 摘要工具:MD5 / SHA-256，输出小写十六进制。
 * <p>用途:Coinly 签名(MD5 小写)、收款地址 SHA-256 索引(回调反查项目，不暴露明文地址)。
 * <p>注意:MD5 仅用于第三方约定的签名算法，不用于任何口令存储。
 */
public final class DigestUtil {

    private DigestUtil() {
    }

    /** MD5 小写十六进制(第三方签名约定，非安全用途) */
    public static String md5Hex(String text) {
        return hex("MD5", text);
    }

    /** SHA-256 小写十六进制 */
    public static String sha256Hex(String text) {
        return hex("SHA-256", text);
    }

    private static String hex(String algorithm, String text) {
        try {
            MessageDigest md = MessageDigest.getInstance(algorithm);
            byte[] digest = md.digest(text.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(digest.length * 2);
            for (byte b : digest) {
                sb.append(Character.forDigit((b >> 4) & 0xF, 16));
                sb.append(Character.forDigit(b & 0xF, 16));
            }
            return sb.toString();
        } catch (NoSuchAlgorithmException e) {
            // JDK 必带这两种算法，理论不会发生
            throw new IllegalStateException("摘要算法不可用: " + algorithm, e);
        }
    }
}
