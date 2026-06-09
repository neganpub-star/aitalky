package com.aitalky.framework.log;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * 操作日志:标注在 Controller 方法上,由 {@link LogAspect} 记录到 sys_oper_log。
 * <p>默认不记录参数(避免泄露密码等敏感字段);确需记录时 {@code saveParams=true} 且自行确保无敏感数据。
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface Log {
    /** 操作描述,如「删除成员」「调整角色」 */
    String value();

    /** 是否记录请求参数(默认 false) */
    boolean saveParams() default false;
}
