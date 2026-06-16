package com.aitalky.framework.i18n;

import com.aitalky.framework.tenant.TenantContext;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.context.MessageSource;
import org.springframework.context.NoSuchMessageException;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.Locale;

/**
 * i18n 文案工具：按「调用方语言」取多语言提示。
 * <p>语言来源优先级：当前请求显式传入 &gt; TenantContext.lang（来自请求头/坐席语言）&gt; 简体中文兜底。
 * <p>API 对外提示（含错误码文案）统一走这里——这是「aitalky-app 返回给前端的提示要多语言」的落点。
 */
@Component
public class MessageUtil {

    private final MessageSource messageSource;

    public MessageUtil(MessageSource messageSource) {
        this.messageSource = messageSource;
    }

    /** 用当前上下文语言取文案 */
    public String get(String key, Object... args) {
        return get(resolveLocale(currentLang()), key, args);
    }

    /**
     * 当前语种:优先 TenantContext.lang(坐席接口经 AuthInterceptor 写入);
     * 为空再直接读请求头 lang/Accept-Language——覆盖 /api/public/**(信使端)等不走 AuthInterceptor 的路径,
     * 否则这些路径的错误提示会恒为中文兜底。
     */
    private static String currentLang() {
        String lang = TenantContext.getLang();
        if (lang != null && !lang.isBlank()) {
            return lang;
        }
        try {
            ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attrs != null) {
                HttpServletRequest req = attrs.getRequest();
                String h = req.getHeader("lang");
                return (h == null || h.isBlank()) ? req.getHeader("Accept-Language") : h;
            }
        } catch (Exception ignore) {
            // 非 web 上下文(定时任务/MQ)取不到请求,走中文兜底
        }
        return null;
    }

    /** 用指定语言取文案 */
    public String get(Locale locale, String key, Object... args) {
        try {
            return messageSource.getMessage(key, args, locale);
        } catch (NoSuchMessageException e) {
            // 找不到对应 key 时返回 key 本身，避免抛错影响主流程
            return key;
        }
    }

    /** 把 zh_CN / en_US / en 之类字符串解析为 Locale，默认简体中文 */
    public static Locale resolveLocale(String lang) {
        if (lang == null || lang.isBlank()) {
            return Locale.SIMPLIFIED_CHINESE;
        }
        String normalized = lang.replace('-', '_');
        String[] parts = normalized.split("_");
        return parts.length >= 2 ? new Locale(parts[0], parts[1]) : new Locale(parts[0]);
    }
}
