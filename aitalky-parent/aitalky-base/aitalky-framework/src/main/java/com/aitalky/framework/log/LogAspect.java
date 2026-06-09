package com.aitalky.framework.log;

import com.aitalky.common.id.SnowflakeIdGenerator;
import com.aitalky.framework.log.entity.SysOperLog;
import com.aitalky.framework.log.mapper.SysOperLogMapper;
import com.aitalky.framework.tenant.TenantContext;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.LocalDateTime;
import java.util.Arrays;

/**
 * 操作日志切面:对 {@link Log} 标注的方法记录操作人/动作/IP/耗时/结果到 sys_oper_log。
 * <p>日志写入失败仅告警,绝不影响主业务;默认不记录参数(避免泄露密码)。
 */
@Slf4j
@Aspect
@Component
@RequiredArgsConstructor
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
public class LogAspect {

    private final SysOperLogMapper operLogMapper;
    private final SnowflakeIdGenerator idGenerator;
    private final ObjectMapper objectMapper;

    @Around("@annotation(logAnno)")
    public Object around(ProceedingJoinPoint pjp, Log logAnno) throws Throwable {
        long start = System.currentTimeMillis();
        int success = 1;
        String errorMsg = null;
        try {
            return pjp.proceed();
        } catch (Throwable t) {
            success = 0;
            errorMsg = t.getMessage();
            throw t;
        } finally {
            saveLog(pjp, logAnno, success, errorMsg, System.currentTimeMillis() - start);
        }
    }

    private void saveLog(ProceedingJoinPoint pjp, Log logAnno, int success, String errorMsg, long cost) {
        try {
            SysOperLog entry = new SysOperLog();
            entry.setId(idGenerator.nextId());
            entry.setProjectId(TenantContext.getProjectId());
            entry.setOperatorId(operatorId());
            entry.setAction(logAnno.value());
            MethodSignature sig = (MethodSignature) pjp.getSignature();
            entry.setMethod(sig.getDeclaringType().getSimpleName() + "." + sig.getName());
            if (logAnno.saveParams()) {
                entry.setParams(serializeArgs(pjp.getArgs()));
            }
            entry.setIp(clientIp());
            entry.setCostMs(cost);
            entry.setSuccess(success);
            entry.setErrorMsg(errorMsg == null ? null : truncate(errorMsg, 500));
            entry.setCreateTime(LocalDateTime.now());
            operLogMapper.insert(entry);
        } catch (Exception e) {
            log.warn("操作日志写入失败: {}", e.getMessage());
        }
    }

    private Long operatorId() {
        Long memberId = TenantContext.getMemberId();
        return memberId != null ? memberId : TenantContext.getAccountId();
    }

    /** 仅序列化可安全输出的简单参数,跳过 request/response/文件等 */
    private String serializeArgs(Object[] args) {
        try {
            Object[] safe = Arrays.stream(args)
                    .filter(a -> a != null && !(a instanceof HttpServletRequest))
                    .filter(a -> !a.getClass().getName().startsWith("jakarta.servlet"))
                    .filter(a -> !a.getClass().getName().contains("MultipartFile"))
                    .toArray();
            return truncate(objectMapper.writeValueAsString(safe), 2000);
        } catch (Exception e) {
            return null;
        }
    }

    private String clientIp() {
        if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attrs) {
            HttpServletRequest req = attrs.getRequest();
            String xff = req.getHeader("X-Forwarded-For");
            if (xff != null && !xff.isBlank()) {
                return xff.split(",")[0].trim();
            }
            return req.getRemoteAddr();
        }
        return null;
    }

    private String truncate(String s, int max) {
        return s.length() <= max ? s : s.substring(0, max);
    }
}
