package com.aitalky.app.controller;

import com.aitalky.common.api.R;
import com.aitalky.framework.tenant.TenantContext;
import com.aitalky.identity.entity.IdProject;
import com.aitalky.identity.service.ProjectService;
import com.aitalky.messenger.dto.MessengerConfigVO;
import com.aitalky.messenger.dto.MessengerLanguageVO;
import com.aitalky.messenger.service.MessengerConfigService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 信使配置(会话服务 → 信使设置 / 紧急通知设置 / 常规设置)。项目内共享,project_id 多租户隔离。
 * <p>品牌名/LOGO = 项目名称/LOGO(只读),在此 controller 注入(messenger 模块不依赖 identity,守模块边界);
 * 保存时品牌由 Service 忽略(在项目设置改)。
 */
@RestController
@RequestMapping("/api/messenger-config")
@RequiredArgsConstructor
public class MessengerConfigController {

    private final MessengerConfigService messengerConfigService;
    private final ProjectService projectService;

    @GetMapping
    public R<MessengerConfigVO> get() {
        MessengerConfigVO cfg = messengerConfigService.getConfig();
        // 注入品牌:取当前项目名称(LOGO 暂无项目字段,后续随项目设置补)
        String brandName = null;
        Long projectId = TenantContext.getProjectId();
        if (projectId != null) {
            IdProject project = projectService.getById(projectId);
            if (project != null) {
                brandName = project.getName();
            }
        }
        return R.ok(withBrand(cfg, brandName));
    }

    @PutMapping
    public R<Void> save(@RequestBody MessengerConfigVO vo) {
        messengerConfigService.saveConfig(vo);
        return R.ok();
    }

    /** 启用语种列表(常规设置页) */
    @GetMapping("/languages")
    public R<List<MessengerLanguageVO>> languages() {
        return R.ok(messengerConfigService.listLanguages());
    }

    /** 覆盖式保存启用语种(增删/设默认) */
    @PutMapping("/languages")
    public R<Void> saveLanguages(@RequestBody List<MessengerLanguageVO> languages) {
        messengerConfigService.saveLanguages(languages);
        return R.ok();
    }

    /** 用项目名填充只读品牌字段(VO 是 record,重建一份) */
    private static MessengerConfigVO withBrand(MessengerConfigVO c, String brandName) {
        return new MessengerConfigVO(
                brandName, c.logo(), c.customDomain(), c.badge(), c.webTitle(), c.webIcon(),
                c.defaultLanguage(), c.enabledLanguages(), c.replyTime(), c.messageRetentionDays(),
                c.popupEnabled(), c.popupAllowClose(),
                c.sysMsgUnread(), c.sysMsgTyping(), c.sysMsgMemberRetract(), c.customerRetractEnabled(),
                c.i18n());
    }
}
