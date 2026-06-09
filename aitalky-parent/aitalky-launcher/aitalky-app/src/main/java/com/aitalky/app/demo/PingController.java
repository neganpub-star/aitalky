package com.aitalky.app.demo;

import com.aitalky.common.api.R;
import com.aitalky.framework.i18n.MessageUtil;
import com.aitalky.framework.tenant.TenantContext;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

/**
 * 健康检查 / 骨架自测样例（公共，无需登录）。
 * <ul>
 *   <li>GET /api/ping —— 统一响应 + 按 lang 头返回多语言提示（演示后端 i18n）</li>
 *   <li>GET /api/whoami —— 需登录，回显 TenantContext（演示 JWT + 多租户上下文）</li>
 * </ul>
 */
@RestController
@RequestMapping("/api")
public class PingController {

    private final MessageUtil messageUtil;

    public PingController(MessageUtil messageUtil) {
        this.messageUtil = messageUtil;
    }

    /** 公共：传 header lang=en_US / zh_CN 看不同语言文案 */
    @GetMapping("/ping")
    public R<String> ping(@RequestHeader(value = "lang", required = false) String lang) {
        Locale locale = MessageUtil.resolveLocale(lang);
        return R.ok(messageUtil.get(locale, "ping.pong"));
    }

    /** 需登录：回显当前租户上下文，验证 JWT 解析 + 多租户隔离 */
    @GetMapping("/whoami")
    public R<Map<String, Object>> whoami() {
        Map<String, Object> info = new LinkedHashMap<>();
        info.put("projectId", TenantContext.getProjectId());
        info.put("accountId", TenantContext.getAccountId());
        info.put("memberId", TenantContext.getMemberId());
        info.put("functions", TenantContext.getFunctions());
        info.put("lang", TenantContext.getLang());
        return R.ok(info);
    }
}
