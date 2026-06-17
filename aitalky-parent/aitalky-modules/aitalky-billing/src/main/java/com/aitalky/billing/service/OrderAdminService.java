package com.aitalky.billing.service;

import com.aitalky.billing.service.dto.AdminOrderQuery;
import com.aitalky.billing.service.dto.AdminOrderVO;
import com.aitalky.common.api.PageResult;

/** 订单管理(平台后管):跨项目订单分页(按创建时间倒序)。 */
public interface OrderAdminService {

    /** 跨项目分页查询订单,按创建时间倒序;projectName 未填(由 admin 层关联) */
    PageResult<AdminOrderVO> page(AdminOrderQuery query);
}
