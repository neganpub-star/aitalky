package com.aitalky.billing.service;

import com.aitalky.billing.service.dto.CreateOrderCmd;
import com.aitalky.billing.service.dto.OrderVO;
import com.aitalky.common.api.PageResult;

/** 订阅订单:下单(新购/续费/升级) / 余额核销开通 / 订单记录。 */
public interface BillingOrderService {

    /**
     * 下单:校验套餐+算价+判定类型,作废旧待支付单后建新待支付单(唯一待支付)。
     * <p>金额 = (套餐月价 + 加购席位数 × 单席位月价) × 月数。
     */
    OrderVO createOrder(Long projectId, CreateOrderCmd cmd);

    /** 当前待支付订单(无则返回 null;供下单弹窗回显) */
    OrderVO pendingOrder(Long projectId);

    /** 余额核销:扣余额 + 订单完成 + 开通/续费/升级订阅(项目锁+事务+乐观锁+状态条件更新) */
    OrderVO payOrder(Long projectId, Long orderId);

    /** 订单记录(分页,按创建时间倒序) */
    PageResult<OrderVO> pageOrders(Long projectId, long current, long size);
}
