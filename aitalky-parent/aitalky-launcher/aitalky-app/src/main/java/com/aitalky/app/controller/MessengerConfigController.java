package com.aitalky.app.controller;

import com.aitalky.common.api.R;
import com.aitalky.messenger.dto.MessengerConfigVO;
import com.aitalky.messenger.service.MessengerConfigService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/**
 * 信使配置(会话服务 → 信使设置 / 紧急通知设置)。项目内共享,project_id 多租户隔离。
 * <p>坐席台后管读写品牌/欢迎语/回复时间/弹窗/多语言紧急通知等;信使端读取走 init 带出。
 */
@RestController
@RequestMapping("/api/messenger-config")
@RequiredArgsConstructor
public class MessengerConfigController {

    private final MessengerConfigService messengerConfigService;

    @GetMapping
    public R<MessengerConfigVO> get() {
        return R.ok(messengerConfigService.getConfig());
    }

    @PutMapping
    public R<Void> save(@RequestBody MessengerConfigVO vo) {
        messengerConfigService.saveConfig(vo);
        return R.ok();
    }
}
