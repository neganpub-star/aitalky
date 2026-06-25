package com.aitalky.billing.service;

import com.aitalky.billing.service.dto.AdminOrderQuery;
import com.aitalky.billing.service.dto.AdminOrderVO;
import com.aitalky.billing.service.dto.OrderStatsVO;
import com.aitalky.common.api.PageResult;

/** 订单管理(平台后管):跨项目订单分页(按创建时间倒序)。 */
public interface OrderAdminService {

    /** 跨项目分页查询订单,按创建时间倒序;projectName 未填(由 admin 层关联) */
    PageResult<AdminOrderVO> page(AdminOrderQuery query);

    /** 跨项目订单统计(全局口径,不随筛选变化):总数/已完成/待支付/累计成交额 */
    OrderStatsVO stats();
}
