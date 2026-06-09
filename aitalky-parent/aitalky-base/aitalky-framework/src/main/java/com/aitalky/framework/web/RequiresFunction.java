package com.aitalky.framework.web;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * 功能权限要求:标注在 Controller 方法上,要求当前成员的角色 functions 含指定权限码,
 * 否则由 {@link FunctionPermissionInterceptor} 拦截返回「无此功能权限」。
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface RequiresFunction {
    /** 权限码,如 member.manage / role.manage / billing.manage */
    String value();
}
