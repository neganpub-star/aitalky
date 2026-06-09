package com.aitalky.framework.web;

import com.aitalky.common.api.ResultCode;
import com.aitalky.common.exception.BizException;
import com.aitalky.framework.security.JwtProperties;
import com.aitalky.framework.security.JwtUtil;
import com.aitalky.framework.tenant.TenantContext;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.Collection;
import java.util.HashSet;
import java.util.Set;

/**
 * 鉴权拦截器：解析 JWT → 填充 {@link TenantContext}（projectId/memberId/role/functions/lang）。
 * <p>无状态：仅凭 token 还原上下文，不查 session，任意实例可处理任意请求。
 * <p>语言解析：优先 token 内 lang，其次请求头 lang / Accept-Language。
 * <p>放行规则由 {@code WebMvcConfig} 配置（登录/信使公共接口不拦）。
 */
public class AuthInterceptor implements HandlerInterceptor {

    private final JwtUtil jwtUtil;
    private final JwtProperties jwtProperties;

    public AuthInterceptor(JwtUtil jwtUtil, JwtProperties jwtProperties) {
        this.jwtUtil = jwtUtil;
        this.jwtProperties = jwtProperties;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        String lang = resolveLang(request);
        String header = request.getHeader(jwtProperties.header());
        if (header == null || !header.startsWith(jwtProperties.prefix())) {
            throw new BizException(ResultCode.UNAUTHORIZED);
        }
        String token = header.substring(jwtProperties.prefix().length());
        try {
            Claims claims = jwtUtil.parse(token);
            TenantContext.set(new TenantContext.Ctx(
                    toLong(claims.get("projectId")),
                    toLong(claims.getSubject()),          // subject = accountId
                    toLong(claims.get("memberId")),
                    toLong(claims.get("roleId")),
                    toFunctionSet(claims.get("functions")),
                    lang
            ));
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            throw new BizException(ResultCode.UNAUTHORIZED);
        }
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        // 必须清理，避免线程复用串上下文
        TenantContext.clear();
    }

    private String resolveLang(HttpServletRequest request) {
        String lang = request.getHeader("lang");
        if (lang == null || lang.isBlank()) {
            lang = request.getHeader("Accept-Language");
        }
        return lang;
    }

    private Long toLong(Object v) {
        if (v == null) {
            return null;
        }
        return v instanceof Number n ? n.longValue() : Long.parseLong(v.toString());
    }

    @SuppressWarnings("unchecked")
    private Set<String> toFunctionSet(Object v) {
        if (v instanceof Collection<?> c) {
            Set<String> set = new HashSet<>();
            for (Object o : c) {
                set.add(String.valueOf(o));
            }
            return set;
        }
        return new HashSet<>();
    }
}
