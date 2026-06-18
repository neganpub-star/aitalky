package com.aitalky.app.controller;

import com.aitalky.app.dto.PublicConfigVO;
import com.aitalky.common.api.R;
import com.aitalky.platform.service.ConfigService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
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

    @GetMapping("/public")
    public R<PublicConfigVO> publicConfig() {
        return R.ok(new PublicConfigVO(
                configService.getValue("contact_telegram", ""),
                configService.getInt("free_trial_days", 15)));
    }
}
