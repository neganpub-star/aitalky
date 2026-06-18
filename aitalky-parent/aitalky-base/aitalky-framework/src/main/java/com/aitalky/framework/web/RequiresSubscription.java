package com.aitalky.framework.web;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * 订阅门禁:标注在 Controller 类/方法上,要求当前项目有「有效订阅」(status=1 且未到期),
 * 否则由订阅切面拦截返回「未订阅/已到期」错误码,前端据此引导前往订阅页。
 * <p>用于工作台功能接口(会话/消息等);设置类(成员/信使配置/计费本身)不标,保证无订阅也能进设置去订阅。
 * <p>切面在 app 层实现(framework 不依赖 billing,故校验逻辑放能注入 BillingService 的 app 模块)。
 */
@Target({ElementType.TYPE, ElementType.METHOD})
@Retention(RetentionPolicy.RUNTIME)
public @interface RequiresSubscription {
}
