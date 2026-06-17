package com.aitalky.billing.service.dto;

/**
 * 后管订单查询(跨项目)。
 *
 * @param projectId 按项目筛选(可空)
 * @param status    按状态筛选 0待支付/1已完成/2已作废(可空)
 * @param type      按类型筛选 new/renew/upgrade(可空)
 * @param current   页码(从1起)
 * @param size      每页大小
 */
public record AdminOrderQuery(
        Long projectId,
        Integer status,
        String type,
        Long current,
        Long size
) {
}
