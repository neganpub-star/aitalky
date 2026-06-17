package com.aitalky.billing.service.dto;

import java.time.LocalDate;

/**
 * 订单记录查询(坐席端订单记录页筛选)。
 *
 * @param current  页码(从1)
 * @param size     每页条数
 * @param type     订单类型筛选 new/renew/upgrade/addon_seat/addon_customer(空=全部)
 * @param status   订单状态筛选 0待支付/1已完成/2已作废(null=全部)
 * @param orderNo  订单编号(精确/前缀,空=不限)
 * @param dateFrom 创建日期起(含,按当天0点;null=不限)
 * @param dateTo   创建日期止(含,按次日0点为上界;null=不限)
 */
public record OrderQuery(
        long current,
        long size,
        String type,
        Integer status,
        String orderNo,
        LocalDate dateFrom,
        LocalDate dateTo
) {
}
