package com.aitalky.framework.security;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * AES-256-GCM 对称加解密(用于收款地址等敏感字段的库内加密)。
 * <p>密钥:外部传入 32 字节(256 位)。不足/超出会直接报错，避免静默截断削弱强度。
 * <p>密文格式:Base64( IV(12B) || ciphertext+tag )，每次加密随机生成 IV，故同一明文多次加密结果不同。
 * <p>GCM 自带完整性校验(tag)，密文被篡改解密会失败。
 */
public final class AesGcmUtil {

    private static final int IV_LENGTH = 12;        // GCM 推荐 12 字节 IV
    private static final int TAG_LENGTH_BITS = 128; // 认证标签 128 位
    private static final int KEY_LENGTH = 32;       // AES-256
    private static final SecureRandom RANDOM = new SecureRandom();

    private AesGcmUtil() {
    }

    /** 加密:返回 Base64(IV||密文)。key 必须为 32 字节明文。 */
    public static String encrypt(String key, String plaintext) {
        try {
            byte[] iv = new byte[IV_LENGTH];
            RANDOM.nextBytes(iv);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, keySpec(key), new GCMParameterSpec(TAG_LENGTH_BITS, iv));
            byte[] enc = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));
            byte[] out = ByteBuffer.allocate(iv.length + enc.length).put(iv).put(enc).array();
            return Base64.getEncoder().encodeToString(out);
        } catch (Exception e) {
            throw new IllegalStateException("AES-GCM 加密失败", e);
        }
    }

    /** 解密:入参为 encrypt 产出的 Base64(IV||密文)。 */
    public static String decrypt(String key, String ciphertextBase64) {
        try {
            byte[] all = Base64.getDecoder().decode(ciphertextBase64);
            ByteBuffer buf = ByteBuffer.wrap(all);
            byte[] iv = new byte[IV_LENGTH];
            buf.get(iv);
            byte[] enc = new byte[buf.remaining()];
            buf.get(enc);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, keySpec(key), new GCMParameterSpec(TAG_LENGTH_BITS, iv));
            return new String(cipher.doFinal(enc), StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new IllegalStateException("AES-GCM 解密失败", e);
        }
    }

    private static SecretKeySpec keySpec(String key) {
        byte[] keyBytes = key.getBytes(StandardCharsets.UTF_8);
        if (keyBytes.length != KEY_LENGTH) {
            // 强制 32 字节，避免配置写错导致降级到弱密钥或抛底层异常
            throw new IllegalArgumentException("AES-256 密钥必须为 32 字节，当前 " + keyBytes.length);
        }
        return new SecretKeySpec(keyBytes, "AES");
    }
}
