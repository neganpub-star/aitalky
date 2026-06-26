package com.aitalky.app.controller;

import com.aitalky.app.dto.PublicConfigVO;
import com.aitalky.common.api.R;
import com.aitalky.platform.dto.AgreementVO;
import com.aitalky.platform.service.AgreementService;
import com.aitalky.platform.service.ConfigService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 坐席端可读的平台公共参数(免登业务无关:客服 Telegram、免费体验天数等)。
 * <p>供套餐订阅页「免费体验」横幅读取;只暴露白名单字段,不泄露全部后管参数。
 */
@RestController
@RequestMapping("/api/config")
@RequiredArgsConstructor
public class ConfigController {

    private final ConfigService configService;
    private final AgreementService agreementService;

    /** 取已发布协议(type:privacy/subscription/terms;lang 缺该语言回退 zh_CN)。订阅弹窗「套餐订阅服务协议」查看用。 */
    @GetMapping("/agreement")
    public R<AgreementVO> agreement(@RequestParam String type, @RequestParam(required = false) String lang) {
        return R.ok(agreementService.getPublished(type, lang));
    }

    @GetMapping("/public")
    public R<PublicConfigVO> publicConfig() {
        return R.ok(new PublicConfigVO(
                configService.getValue("contact_telegram", ""),
                configService.getInt("free_trial_days", 15),
                parseLong(configService.getValue("default_translate_char", "200"), 200),
                parseLong(configService.getValue("default_ai_tokens", "4000"), 4000),
                parseLong(configService.getValue("default_customer", "100"), 100)));
    }

    private static long parseLong(String v, long def) {
        try {
            return Long.parseLong(v.trim());
        } catch (NumberFormatException e) {
            return def;
        }
    }
}
