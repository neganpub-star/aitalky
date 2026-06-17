package com.aitalky.admin.controller;

import com.aitalky.billing.service.CoinAdminService;
import com.aitalky.billing.service.dto.CoinAdminVO;
import com.aitalky.billing.service.dto.SaveCoinCmd;
import com.aitalky.common.api.R;
import com.aitalky.framework.web.RequiresFunction;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 币种配置管理接口(平台后管,权限 orders)。bil_coin 数据驱动充值,加币种/链只插数据。
 */
@RestController
@RequestMapping("/api/admin/coins")
@RequiredArgsConstructor
public class CoinAdminController {

    private final CoinAdminService coinAdminService;

    /** 币种列表(含停用,按 sort 升序) */
    @RequiresFunction("orders")
    @GetMapping
    public R<List<CoinAdminVO>> list() {
        return R.ok(coinAdminService.list());
    }

    /** 新增/编辑币种 */
    @RequiresFunction("orders")
    @PostMapping
    public R<Long> save(@RequestBody SaveCoinCmd cmd) {
        return R.ok(coinAdminService.save(cmd));
    }

    /** 启用/停用 */
    @RequiresFunction("orders")
    @PutMapping("/{id}/status")
    public R<Void> updateStatus(@PathVariable Long id, @RequestParam Integer status) {
        coinAdminService.updateStatus(id, status);
        return R.ok();
    }

    /** 删除 */
    @RequiresFunction("orders")
    @DeleteMapping("/{id}")
    public R<Void> delete(@PathVariable Long id) {
        coinAdminService.delete(id);
        return R.ok();
    }
}
