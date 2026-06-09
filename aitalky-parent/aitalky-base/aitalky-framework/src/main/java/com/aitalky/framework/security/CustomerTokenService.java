package com.aitalky.framework.security;

import com.aitalky.common.api.ResultCode;
import com.aitalky.common.exception.BizException;
import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.Map;

/**
 * 信使端(终端客户)令牌:与坐席 JWT 区分(scope=customer),只携带 projectId/customerId。
 * 客户公共接口(/api/public/**)用它鉴权,不能用坐席令牌访问租户接口。
 */
@Service
@RequiredArgsConstructor
public class CustomerTokenService {

    private final JwtUtil jwtUtil;

    /** 签发客户令牌 */
    public String issue(Long projectId, Long customerId) {
        return jwtUtil.issue(String.valueOf(customerId),
                Map.of("scope", "customer", "projectId", projectId, "customerId", customerId));
    }

    /** 客户身份 */
    public record CustomerPrincipal(Long projectId, Long customerId) {
    }

    /** 解析客户令牌(Authorization: Bearer xxx 或裸 token);非法抛未授权 */
    public CustomerPrincipal parse(String bearer) {
        if (!StringUtils.hasText(bearer)) {
            throw new BizException(ResultCode.UNAUTHORIZED);
        }
        String token = bearer.startsWith("Bearer ") ? bearer.substring(7) : bearer;
        try {
            Claims c = jwtUtil.parse(token);
            if (!"customer".equals(c.get("scope"))) {
                throw new BizException(ResultCode.UNAUTHORIZED);
            }
            return new CustomerPrincipal(toLong(c.get("projectId")), toLong(c.get("customerId")));
        } catch (BizException e) {
            throw e;
        } catch (Exception e) {
            throw new BizException(ResultCode.UNAUTHORIZED);
        }
    }

    private Long toLong(Object v) {
        return v == null ? null : (v instanceof Number n ? n.longValue() : Long.parseLong(v.toString()));
    }
}
