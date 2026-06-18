package com.aitalky.admin.controller;

import com.aitalky.common.api.R;
import com.aitalky.framework.web.RequiresFunction;
import com.aitalky.platform.dto.ConfigVO;
import com.aitalky.platform.service.ConfigService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 参数管理接口(平台权限 config)。列出全部参数 + 改值。
 */
@RestController
@RequestMapping("/api/admin/configs")
@RequiredArgsConstructor
public class ConfigAdminController {

    private final ConfigService configService;

    @RequiresFunction("config")
    @GetMapping
    public R<List<ConfigVO>> list() {
        return R.ok(configService.list());
    }

    @RequiresFunction("config")
    @PutMapping("/{id}")
    public R<Void> update(@PathVariable Long id, @RequestParam String value) {
        configService.updateValue(id, value);
        return R.ok();
    }
}
