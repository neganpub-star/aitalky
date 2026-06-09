package com.aitalky.framework.tenant;

import java.util.Collections;
import java.util.Set;

/**
 * 租户/登录上下文（请求级 ThreadLocal）。
 * <p>由 {@code AuthInterceptor} 在请求入口解析 JWT 后写入，请求结束清理。
 * <p>多租户 SQL 拦截器（{@code MyBatisPlusConfig}）从这里取 projectId 自动拼 where。
 * <p>注意：虚拟线程下每个请求仍是独立线程，ThreadLocal 适用；若后续用线程池异步透传，改 TransmittableThreadLocal。
 */
public final class TenantContext {

    private TenantContext() {
    }

    private static final ThreadLocal<Ctx> HOLDER = new ThreadLocal<>();

    /** 上下文数据 */
    public record Ctx(
            Long projectId,       // 当前项目（租户）id；平台后管/未登录为 null
            Long accountId,       // 登录账号 id
            Long memberId,        // 当前项目下的成员 id（坐席）
            Long roleId,          // 角色 id
            Set<String> functions,// 功能权限码集合（RBAC functions）
            String lang           // 调用方语言（i18n），如 zh_CN / en_US
    ) {
    }

    public static void set(Ctx ctx) {
        HOLDER.set(ctx);
    }

    public static Ctx get() {
        return HOLDER.get();
    }

    public static Long getProjectId() {
        Ctx c = HOLDER.get();
        return c == null ? null : c.projectId();
    }

    public static Long getMemberId() {
        Ctx c = HOLDER.get();
        return c == null ? null : c.memberId();
    }

    public static Long getAccountId() {
        Ctx c = HOLDER.get();
        return c == null ? null : c.accountId();
    }

    public static String getLang() {
        Ctx c = HOLDER.get();
        return c == null ? null : c.lang();
    }

    /** 是否拥有某功能权限 */
    public static boolean hasFunction(String code) {
        Ctx c = HOLDER.get();
        return c != null && c.functions() != null && c.functions().contains(code);
    }

    public static Set<String> getFunctions() {
        Ctx c = HOLDER.get();
        return c == null || c.functions() == null ? Collections.emptySet() : c.functions();
    }

    public static void clear() {
        HOLDER.remove();
    }
}
