package com.aitalky.framework.security;

import com.aitalky.common.api.ResultCode;
import com.aitalky.common.exception.BizException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.PrivateKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.util.Base64;

/**
 * RSA 加解密服务:前端用公钥加密密码,后端用私钥解密。
 * <p>未配置密钥(如 admin/ws 入口)时不解析私钥,调用 decrypt 才报错,保证这些入口仍能正常启动。
 */
@Slf4j
@Service
public class RsaCryptoService {

    private final String publicKey;
    private final PrivateKey privateKey;

    public RsaCryptoService(RsaProperties props) {
        this.publicKey = props.publicKey();
        this.privateKey = parsePrivateKey(props.privateKey());
    }

    /** 公钥(下发前端) */
    public String getPublicKey() {
        return publicKey;
    }

    /** 用私钥解密前端传来的密文(Base64);失败抛参数异常 */
    public String decrypt(String cipherBase64) {
        if (privateKey == null) {
            throw new BizException(ResultCode.SYSTEM_ERROR);
        }
        try {
            Cipher cipher = Cipher.getInstance("RSA/ECB/PKCS1Padding");
            cipher.init(Cipher.DECRYPT_MODE, privateKey);
            byte[] plain = cipher.doFinal(Base64.getDecoder().decode(cipherBase64));
            return new String(plain, StandardCharsets.UTF_8);
        } catch (Exception e) {
            log.warn("RSA 解密失败: {}", e.getMessage());
            throw new BizException(ResultCode.PARAM_INVALID);
        }
    }

    private static PrivateKey parsePrivateKey(String base64) {
        if (base64 == null || base64.isBlank()) {
            return null;
        }
        try {
            byte[] der = Base64.getDecoder().decode(base64);
            return KeyFactory.getInstance("RSA").generatePrivate(new PKCS8EncodedKeySpec(der));
        } catch (Exception e) {
            throw new IllegalStateException("RSA 私钥解析失败,请检查 aitalky.rsa.private-key", e);
        }
    }
}
