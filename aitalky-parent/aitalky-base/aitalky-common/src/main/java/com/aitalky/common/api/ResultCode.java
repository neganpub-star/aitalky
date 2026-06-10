package com.aitalky.common.api;

/**
 * 统一错误码。
 * <p>message 仅作为兜底默认文案；对外提示走 i18n（framework 的 MessageUtil 按 code 取多语言文案）。
 */
public enum ResultCode {

    /** 成功 */
    SUCCESS(0, "success"),
    /** 通用业务失败 */
    FAIL(1, "fail"),

    // ===== 鉴权 / 权限 4xx =====
    UNAUTHORIZED(401, "unauthorized"),
    FORBIDDEN(403, "forbidden"),
    NOT_FOUND(404, "not.found"),

    // ===== 业务域 1xxx =====
    PARAM_INVALID(1001, "param.invalid"),
    TENANT_MISSING(1002, "tenant.missing"),
    NO_FUNCTION_PERMISSION(1003, "no.function.permission"),

    // ===== 身份/账号 101x =====
    EMAIL_ALREADY_EXISTS(1010, "email.exists"),
    LOGIN_FAILED(1011, "login.failed"),
    ACCOUNT_DISABLED(1012, "account.disabled"),
    PROJECT_NOT_FOUND(1013, "project.not.found"),
    NOT_PROJECT_MEMBER(1014, "not.project.member"),
    VERIFY_CODE_ERROR(1015, "verify.code.error"),
    VERIFY_CODE_TOO_FREQUENT(1016, "verify.code.too.frequent"),
    OPERATE_OWNER_FORBIDDEN(1017, "operate.owner.forbidden"),
    MEMBER_NOT_FOUND(1018, "member.not.found"),
    OLD_PASSWORD_ERROR(1019, "old.password.error"),
    INVITE_CODE_INVALID(1021, "invite.code.invalid"),

    // ===== 限流 102x =====
    RATE_LIMITED(1020, "rate.limited"),

    // ===== 系统 5xx =====
    SYSTEM_ERROR(500, "system.error");

    private final int code;
    /** i18n key（messages_*.properties 中的键），同时作为默认英文文案的占位 */
    private final String i18nKey;

    ResultCode(int code, String i18nKey) {
        this.code = code;
        this.i18nKey = i18nKey;
    }

    public int getCode() {
        return code;
    }

    public String getI18nKey() {
        return i18nKey;
    }
}
