package com.aitalky.billing.service;

import java.math.BigDecimal;
import java.util.Map;

/** 项目钱包:余额查询 + Coinly 充值回调入账。 */
public interface BillingWalletService {

    /** 取项目余额(钱包不存在视为 0) */
    BigDecimal getBalance(Long projectId);

    /**
     * 处理 Coinly 充值回调:验签 → 反查项目 → 幂等入账。
     * <p>验签失败/地址未知抛业务异常;重复 txid 静默幂等。非成功状态忽略。
     *
     * @param params 回调全部参数(含 sign)
     */
    void handleCoinlyCallback(Map<String, Object> params);
}
