package com.aitalky.billing.service.dto;

/**
 * 可充值币种(坐席端选网络)。
 *
 * @param symbol    币种符号(USDT)
 * @param currency  币种全称(USDT-TRC20)
 * @param network   网络标识(TRC20)
 * @param chainName 链名称(Tron)
 */
public record CoinVO(String symbol, String currency, String network, String chainName) {
}
