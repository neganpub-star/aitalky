package com.aitalky.billing.service.dto;

import java.util.Map;

/**
 * 下单命令(订阅/续费/升级)。
 *
 * @param planId   套餐id
 * @param months   订阅月数(≥套餐起订月数,30天/月)
 * @param seats    加购席位数(套餐配额之外,≥0)
 * @param currency 下单选定收款网络(如 USDT-TRC20);决定收款地址所在链,下单后不可改
 * @param packs    搭售的永久加量包份数(resourceType→包数:customer/translate_char/ai_tokens),可为空
 */
public record CreateOrderCmd(Long planId, Integer months, Integer seats, String currency,
                             Map<String, Integer> packs) {
}
