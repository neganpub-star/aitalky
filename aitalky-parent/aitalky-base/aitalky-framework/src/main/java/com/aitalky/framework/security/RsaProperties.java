package com.aitalky.framework.security;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * RSA 密钥配置(aitalky.rsa.*),用于登录/注册密码的前端加密、后端解密。
 *
 * @param publicKey  公钥(下发前端,Base64 PKCS8)
 * @param privateKey 私钥(后端解密用,Base64 PKCS8;生产用环境变量/配置中心)
 */
@ConfigurationProperties(prefix = "aitalky.rsa")
public record RsaProperties(String publicKey, String privateKey) {
}
