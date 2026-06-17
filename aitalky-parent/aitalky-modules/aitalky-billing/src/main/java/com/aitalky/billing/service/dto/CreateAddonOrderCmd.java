package com.aitalky.billing.service.dto;

/**
 * 加购下单命令(独立购买席位/客户配额,不换套餐)。
 *
 * @param resourceType 加购资源类型:seat 席位 / customer 客户配额
 * @param quantity     加购数量:席位=新增席位数;客户配额=客户拓展包数(每包配额见 AddonQuoteVO.packAmount)
 */
public record CreateAddonOrderCmd(String resourceType, Integer quantity) {
}
