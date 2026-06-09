package com.aitalky.framework.web;

import com.aitalky.common.api.R;
import com.aitalky.common.api.ResultCode;
import com.aitalky.common.exception.BizException;
import com.aitalky.framework.i18n.MessageUtil;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.validation.BindException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * 全局异常处理：统一返回 {@link R}，对外提示按调用方语言走 i18n。
 * <p>生产环境不向前端暴露堆栈，只返回通用/业务文案（符合安全规范）。
 */
@Slf4j
@RestControllerAdvice
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
public class GlobalExceptionHandler {

    private final MessageUtil messageUtil;

    public GlobalExceptionHandler(MessageUtil messageUtil) {
        this.messageUtil = messageUtil;
    }

    /** 业务异常：WARN 级别，按 i18nKey + args 渲染多语言文案 */
    @ExceptionHandler(BizException.class)
    public R<Void> handleBiz(BizException e) {
        log.warn("业务异常 code={}, key={}", e.getCode(), e.getI18nKey());
        String msg = messageUtil.get(e.getI18nKey(), e.getArgs());
        return R.fail(e.getCode(), msg);
    }

    /** 参数校验异常 */
    @ExceptionHandler({MethodArgumentNotValidException.class, BindException.class})
    public R<Void> handleValidation(BindException e) {
        FieldError fieldError = e.getBindingResult().getFieldError();
        String detail = fieldError == null ? "" : fieldError.getDefaultMessage();
        String msg = messageUtil.get(ResultCode.PARAM_INVALID.getI18nKey()) + (detail.isEmpty() ? "" : ": " + detail);
        return R.fail(ResultCode.PARAM_INVALID.getCode(), msg);
    }

    /** 兜底：系统异常记 ERROR，不暴露细节 */
    @ExceptionHandler(Exception.class)
    public R<Void> handleOther(Exception e) {
        log.error("系统异常", e);
        return R.fail(ResultCode.SYSTEM_ERROR.getCode(), messageUtil.get(ResultCode.SYSTEM_ERROR.getI18nKey()));
    }
}
