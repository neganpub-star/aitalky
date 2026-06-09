package com.aitalky.common.util;

/** 敏感信息脱敏工具 */
public final class MaskUtil {

    private MaskUtil() {
    }

    /** 邮箱脱敏:保留前3位 + **** + @域名(如 bao****@gmail.com) */
    public static String maskEmail(String email) {
        if (email == null) {
            return null;
        }
        int at = email.indexOf('@');
        if (at <= 0) {
            return email;
        }
        String name = email.substring(0, at);
        String domain = email.substring(at);
        String head = name.length() <= 3 ? name.substring(0, 1) : name.substring(0, 3);
        return head + "****" + domain;
    }
}
