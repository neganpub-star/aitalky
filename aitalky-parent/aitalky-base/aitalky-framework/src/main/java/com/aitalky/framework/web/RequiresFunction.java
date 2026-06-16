package com.aitalky.framework.web;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * 功能权限要求:标注在 Controller 方法上,要求当前成员的角色 functions 含指定权限码(任一即可),
 * 否则由 {@link FunctionPermissionInterceptor} 拦截返回「无此功能权限」。
 * <p>可填多个实现"可见不可改":读接口标 {@code @RequiresFunction({"x.view","x.manage"})}(查看或管理皆可进),
 * 写接口标 {@code @RequiresFunction("x.manage")}(只有管理权能改)。
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface RequiresFunction {
    /** 权限码(任一命中即放行),如 member.manage / {"member.view","member.manage"} */
    String[] value();
}
