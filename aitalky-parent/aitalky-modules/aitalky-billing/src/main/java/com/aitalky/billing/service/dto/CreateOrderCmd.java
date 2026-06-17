package com.aitalky.billing.service.dto;

/**
 * 下单命令。
 *
 * @param planId   套餐id
 * @param months   订阅月数(≥套餐起订月数,30天/月)
 * @param seats    加购席位数(套餐配额之外,≥0)
 * @param currency 下单选定收款网络(如 USDT-TRC20);决定收款地址所在链,下单后不可改
 */
public record CreateOrderCmd(Long planId, Integer months, Integer seats, String currency) {
}
