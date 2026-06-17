package com.aitalky.billing.service.dto;

import java.math.BigDecimal;

/**
 * 钱包余额(坐席端概览/充值页)。
 *
 * @param balance  余额
 * @param currency 计价币种(稳定币 1:1 USD)
 */
public record WalletVO(BigDecimal balance, String currency) {
}
