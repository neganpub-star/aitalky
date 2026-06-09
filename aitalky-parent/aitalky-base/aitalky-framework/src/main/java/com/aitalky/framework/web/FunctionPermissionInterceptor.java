package com.aitalky.framework.web;

import com.aitalky.common.api.ResultCode;
import com.aitalky.common.exception.BizException;
import com.aitalky.framework.tenant.TenantContext;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * 功能权限拦截器:对带 {@link RequiresFunction} 的接口,校验当前成员是否拥有该功能权限。
 * <p>在鉴权拦截器之后执行(此时 TenantContext 已填充 functions)。
 */
public class FunctionPermissionInterceptor implements HandlerInterceptor {

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if (!(handler instanceof HandlerMethod hm)) {
            return true;
        }
        RequiresFunction rf = hm.getMethodAnnotation(RequiresFunction.class);
        if (rf == null) {
            return true;
        }
        if (!TenantContext.hasFunction(rf.value())) {
            throw new BizException(ResultCode.NO_FUNCTION_PERMISSION);
        }
        return true;
    }
}
