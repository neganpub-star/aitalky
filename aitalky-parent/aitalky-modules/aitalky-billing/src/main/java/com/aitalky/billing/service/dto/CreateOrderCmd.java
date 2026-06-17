package com.aitalky.billing.service.dto;

/**
 * 下单命令。
 *
 * @param planId 套餐id
 * @param months 订阅月数(≥套餐起订月数,30天/月)
 * @param seats  加购席位数(套餐配额之外,≥0)
 */
public record CreateOrderCmd(Long planId, Integer months, Integer seats) {
}
