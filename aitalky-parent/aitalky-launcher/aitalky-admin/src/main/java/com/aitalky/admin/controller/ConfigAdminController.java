package com.aitalky.admin.controller;

import com.aitalky.common.api.R;
import com.aitalky.framework.web.RequiresFunction;
import com.aitalky.platform.dto.ConfigSaveCmd;
import com.aitalky.platform.dto.ConfigVO;
import com.aitalky.platform.service.ConfigService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 参数管理接口(平台权限 config)。列出 + 新增 + 编辑(全字段) + 删除。
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
    @PostMapping
    public R<Long> create(@RequestBody ConfigSaveCmd cmd) {
        return R.ok(configService.create(cmd));
    }

    @RequiresFunction("config")
    @PutMapping("/{id}")
    public R<Void> update(@PathVariable Long id, @RequestBody ConfigSaveCmd cmd) {
        configService.update(id, cmd);
        return R.ok();
    }

    @RequiresFunction("config")
    @DeleteMapping("/{id}")
    public R<Void> delete(@PathVariable Long id) {
        configService.delete(id);
        return R.ok();
    }
}
