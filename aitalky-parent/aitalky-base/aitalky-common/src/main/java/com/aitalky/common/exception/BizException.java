package com.aitalky.common.exception;

import com.aitalky.common.api.ResultCode;

import java.io.Serial;

/**
 * 业务异常：统一封装，禁止裸抛 RuntimeException。
 * <p>携带 {@link ResultCode}（含 i18n key），由全局异常处理器按调用方语言渲染对外文案。
 * args 为 i18n 文案的占位参数（MessageFormat 风格）。
 */
public class BizException extends RuntimeException {

    @Serial
    private static final long serialVersionUID = 1L;

    private final int code;
    /** i18n key */
    private final String i18nKey;
    /** i18n 文案占位参数 */
    private final transient Object[] args;

    public BizException(ResultCode resultCode, Object... args) {
        super(resultCode.getI18nKey());
        this.code = resultCode.getCode();
        this.i18nKey = resultCode.getI18nKey();
        this.args = args;
    }

    public BizException(int code, String i18nKey, Object... args) {
        super(i18nKey);
        this.code = code;
        this.i18nKey = i18nKey;
        this.args = args;
    }

    public int getCode() {
        return code;
    }

    public String getI18nKey() {
        return i18nKey;
    }

    public Object[] getArgs() {
        return args;
    }
}
