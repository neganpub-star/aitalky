package com.aitalky.billing.service;

import com.aitalky.billing.service.dto.AddonQuoteVO;
import com.aitalky.billing.service.dto.CreateAddonOrderCmd;
import com.aitalky.billing.service.dto.CreateOrderCmd;
import com.aitalky.billing.service.dto.OrderVO;
import com.aitalky.billing.service.dto.OrderQuery;
import com.aitalky.common.api.PageResult;

/** 订阅订单:下单(新购/续费/升级/加购) / 余额核销开通 / 订单记录。 */
public interface BillingOrderService {

    /**
     * 下单:校验套餐+算价+判定类型,作废旧待支付单后建新待支付单(唯一待支付)。
     * <p>金额 = (套餐月价 + 加购席位数 × 单席位月价) × 月数。
     */
    OrderVO createOrder(Long projectId, CreateOrderCmd cmd);

    /**
     * 加购下单(独立购买席位/客户配额,不换套餐、不重起算)。
     * <p>席位:按订阅剩余天数折算计价(单席位月价 × 数量 × 剩余天/30),核销后只加订阅 seats、不改到期日。
     * <p>客户配额:永久配额包(每包价 × 包数),核销后加订阅 extra_customers。
     * <p>前提:必须有有效订阅,否则抛 {@code BILLING_SUBSCRIPTION_REQUIRED}。同样作废旧待支付单后建新单。
     */
    OrderVO createAddonOrder(Long projectId, CreateAddonOrderCmd cmd);

    /** 加购报价(弹窗实时算合计:席位单价/剩余天数/到期时间,客户配额每包价/每包数)。 */
    AddonQuoteVO addonQuote(Long projectId, String resourceType);

    /** 当前待支付订单(无则返回 null;供下单弹窗回显) */
    OrderVO pendingOrder(Long projectId);

    /** 取消待支付订单(status 0→2;仅本项目待支付单可取消) */
    void cancelOrder(Long projectId, Long orderId);

    /** 余额核销:扣余额 + 订单完成 + 开通/续费/升级订阅(项目锁+事务+乐观锁+状态条件更新) */
    OrderVO payOrder(Long projectId, Long orderId);

    /** 订单记录(分页,按创建时间倒序;支持类型/状态/日期范围/订单号筛选) */
    PageResult<OrderVO> pageOrders(Long projectId, OrderQuery query);

    /** 单席位月价(席位加量包单价;下单弹窗实时算合计用) */
    java.math.BigDecimal seatMonthlyPrice();

    /**
     * 充值到账后自动核销:若项目有待支付订单且余额(含本次到账)≥订单金额,则核销开通。
     * <p>这是计费闭环关键一步——用户下单后转账到固定地址,Coinly 回调入账即自动完成订单;
     * 余额不足(分批转/对不上)则不动,留余额兜底防丢钱。供 {@code BillingWalletService} 回调触发。
     */
    void autoSettlePendingOrder(Long projectId);
}
