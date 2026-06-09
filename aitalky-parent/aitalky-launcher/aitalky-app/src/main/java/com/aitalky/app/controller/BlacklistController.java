package com.aitalky.app.controller;

import com.aitalky.app.dto.AddBlacklistReq;
import com.aitalky.common.api.PageResult;
import com.aitalky.common.api.R;
import com.aitalky.common.api.ResultCode;
import com.aitalky.common.exception.BizException;
import com.aitalky.customer.entity.CusCustomer;
import com.aitalky.customer.service.CustomerService;
import com.aitalky.framework.log.Log;
import com.aitalky.framework.web.RequiresFunction;
import com.aitalky.messenger.dto.BlacklistVO;
import com.aitalky.messenger.service.BlacklistService;
import lombok.RequiredArgsConstructor;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

/**
 * 黑名单管理(信使设置 → 黑名单)。需「messenger.setting」功能权限。
 * <p>拉黑对象:用户(业务UID,全设备生效)或游客(visitorId,仅该设备)。
 */
@RestController
@RequestMapping("/api/blacklist")
@RequiredArgsConstructor
public class BlacklistController {

    private final BlacklistService blacklistService;
    private final CustomerService customerService;

    /** 分页列表 */
    @GetMapping
    @RequiresFunction("messenger.setting")
    public R<PageResult<BlacklistVO>> page(@RequestParam(defaultValue = "1") long page,
                                           @RequestParam(defaultValue = "20") long size) {
        return R.ok(blacklistService.page(page, size));
    }

    /** 手动加入黑名单 */
    @PostMapping
    @RequiresFunction("messenger.setting")
    @Log("加入黑名单")
    public R<Void> add(@RequestBody AddBlacklistReq req) {
        blacklistService.add(req.targetType(), req.targetValue(), req.reason());
        return R.ok();
    }

    /** 按客户拉黑(详情面板「加入黑名单」):解析其 UID/游客标识 */
    @PostMapping("/customer/{customerId}")
    @RequiresFunction("messenger.setting")
    @Log("拉黑客户")
    public R<Void> blockCustomer(@PathVariable Long customerId, @RequestParam(required = false) String reason) {
        CusCustomer cu = customerService.getById(customerId);
        if (cu == null) {
            throw new BizException(ResultCode.PARAM_INVALID);
        }
        // 有业务UID → 拉黑用户(全设备);否则拉黑游客设备
        if (StringUtils.hasText(cu.getExternalUserId())) {
            blacklistService.add(1, cu.getExternalUserId(), reason);
        } else if (StringUtils.hasText(cu.getVisitorId())) {
            blacklistService.add(2, cu.getVisitorId(), reason);
        } else {
            throw new BizException(ResultCode.PARAM_INVALID);
        }
        return R.ok();
    }

    /** 移出黑名单 */
    @DeleteMapping("/{id}")
    @RequiresFunction("messenger.setting")
    @Log("移出黑名单")
    public R<Void> remove(@PathVariable Long id) {
        blacklistService.remove(id);
        return R.ok();
    }
}
