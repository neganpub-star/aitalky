package com.aitalky.billing.service.dto;

/**
 * 充值收款地址(返回坐席端展示二维码/复制)。
 *
 * @param currency  币种全称(如 USDT-TRC20)
 * @param network   网络(如 TRC20)
 * @param chainName 链名称(如 Tron)
 * @param address   链上收款地址(明文)
 */
public record RechargeAddressVO(String currency, String network, String chainName, String address) {
}
