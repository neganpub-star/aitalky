package com.aitalky.admin.controller;

import com.aitalky.common.api.R;
import com.aitalky.framework.web.RequiresFunction;
import com.aitalky.platform.dto.AgreementVO;
import com.aitalky.platform.dto.SaveAgreementCmd;
import com.aitalky.platform.service.AgreementService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 协议管理接口(平台权限 agreements)。
 */
@RestController
@RequestMapping("/api/admin/agreements")
@RequiredArgsConstructor
public class AgreementAdminController {

    private final AgreementService agreementService;

    @RequiresFunction("agreements")
    @GetMapping
    public R<List<AgreementVO>> list() {
        return R.ok(agreementService.list());
    }

    @RequiresFunction("agreements")
    @PostMapping
    public R<Long> save(@Valid @RequestBody SaveAgreementCmd cmd) {
        return R.ok(agreementService.save(cmd));
    }

    @RequiresFunction("agreements")
    @DeleteMapping("/{id}")
    public R<Void> delete(@PathVariable Long id) {
        agreementService.delete(id);
        return R.ok();
    }
}
