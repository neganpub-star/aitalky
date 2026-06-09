package com.aitalky.framework.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.Map;

/**
 * JWT 工具：签发 / 解析。
 * <p>无状态鉴权——不存服务端 session，任意 app 实例可校验任意 token（横向扩展前提）。
 */
@Component
public class JwtUtil {

    private final SecretKey key;
    private final long expireMillis;

    public JwtUtil(JwtProperties properties) {
        // HS256 要求密钥长度 >= 256bit，配置请保证足够长
        this.key = Keys.hmacShaKeyFor(properties.secret().getBytes(StandardCharsets.UTF_8));
        this.expireMillis = properties.expireHours() * 3600_000L;
    }

    /** 签发 token。subject=accountId，claims 放 projectId/memberId/roleId 等 */
    public String issue(String subject, Map<String, Object> claims) {
        long now = System.currentTimeMillis();
        return Jwts.builder()
                .subject(subject)
                .claims(claims)
                .issuedAt(new Date(now))
                .expiration(new Date(now + expireMillis))
                .signWith(key)
                .compact();
    }

    /** 解析并校验 token，返回 claims；非法/过期抛 JwtException */
    public Claims parse(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
