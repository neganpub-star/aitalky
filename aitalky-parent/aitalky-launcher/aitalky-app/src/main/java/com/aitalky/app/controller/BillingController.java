package com.aitalky.app.controller;

import com.aitalky.app.dto.BillingOverviewVO;
import com.aitalky.billing.entity.BilSubscription;
import com.aitalky.billing.service.BillingAddressService;
import com.aitalky.billing.service.BillingOrderService;
import com.aitalky.billing.service.BillingService;
import com.aitalky.billing.service.BillingWalletService;
import com.aitalky.billing.service.dto.AddonQuoteVO;
import com.aitalky.billing.service.dto.CoinVO;
import com.aitalky.billing.service.dto.CreateAddonOrderCmd;
import com.aitalky.billing.service.dto.CreateOrderCmd;
import com.aitalky.billing.service.dto.OrderQuery;
import com.aitalky.billing.service.dto.OrderVO;
import com.aitalky.billing.service.dto.PricingVO;
import com.aitalky.billing.service.dto.RechargeAddressVO;
import com.aitalky.billing.service.dto.UsageVO;
import com.aitalky.billing.service.dto.WalletVO;
import org.springframework.format.annotation.DateTimeFormat;
import com.aitalky.common.api.PageResult;
import com.aitalky.common.api.R;
import com.aitalky.customer.service.CustomerService;
import com.aitalky.framework.tenant.TenantContext;
import com.aitalky.identity.service.MemberService;
import com.aitalky.platform.dto.PlanQuotaVO;
import com.aitalky.platform.dto.PlanVO;
import com.aitalky.platform.service.PlanService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * 服务订阅(坐席端):套餐展示 + 概览。下单/充值/升级续费见后续期。
 * <p>套餐定义复用平台 PlanService(只暴露上架);概览取本项目订阅 + 套餐配额。
 */
@RestController
@RequestMapping("/api/billing")
@RequiredArgsConstructor
public class BillingController {

    private final PlanService planService;
    private final BillingService billingService;
    private final BillingAddressService addressService;
    private final BillingWalletService walletService;
    private final BillingOrderService orderService;
    private final MemberService memberService;
    private final CustomerService customerService;
    private final com.aitalky.platform.service.ConfigService configService;

    /** 上架套餐列表(含配额/功能;对齐套餐订阅页卡片) */
    @GetMapping("/plans")
    public R<List<PlanVO>> plans() {
        List<PlanVO> list = planService.list().stream()
                .filter(p -> p.status() != null && p.status() == 1)
                .toList();
        return R.ok(list);
    }

    /** 当前项目订阅概览 */
    @GetMapping("/overview")
    public R<BillingOverviewVO> overview() {
        Long projectId = TenantContext.getProjectId();
        BilSubscription sub = billingService.getSubscription(projectId);
        if (sub == null) {
            return R.ok(new BillingOverviewVO(false, null, null, null, null, null, false, List.of(), List.of()));
        }
        PlanVO plan = planService.get(sub.getPlanId());
        boolean expired = sub.getExpireTime() != null && sub.getExpireTime().isBefore(LocalDateTime.now());
        return R.ok(new BillingOverviewVO(
                true, sub.getPlanId(), sub.getPlanCode(), sub.getPlanName(), plan == null ? null : plan.level(),
                sub.getExpireTime(), expired,
                plan == null ? List.of() : plan.quotas(),
                plan == null ? List.of() : plan.features()));
    }

    /** 可充值币种(选网络:USDT TRC20/ERC20) */
    @GetMapping("/coins")
    public R<List<CoinVO>> coins() {
        return R.ok(addressService.listCoins());
    }

    /** 计费单价(下单弹窗实时算合计:席位月单价等) */
    @GetMapping("/pricing")
    public R<PricingVO> pricing() {
        return R.ok(new PricingVO(orderService.seatMonthlyPrice()));
    }

    /** 当前项目钱包余额 */
    @GetMapping("/wallet")
    public R<WalletVO> wallet() {
        Long projectId = TenantContext.getProjectId();
        return R.ok(new WalletVO(walletService.getBalance(projectId), "USDT"));
    }

    /** 取/建项目在指定币种所属链上的固定收款地址(充值用) */
    @PostMapping("/address")
    public R<RechargeAddressVO> address(@RequestParam String currency) {
        Long projectId = TenantContext.getProjectId();
        return R.ok(addressService.getOrCreateAddress(projectId, currency));
    }

    /** 下单(新购/续费/升级;算价+唯一待支付) */
    @PostMapping("/order")
    public R<OrderVO> createOrder(@RequestBody CreateOrderCmd cmd) {
        Long projectId = TenantContext.getProjectId();
        return R.ok(orderService.createOrder(projectId, cmd));
    }

    /** 加购报价(席位单价/剩余天数/到期时间;客户配额每包价/每包数) */
    @GetMapping("/addon/quote")
    public R<AddonQuoteVO> addonQuote(@RequestParam String resourceType) {
        Long projectId = TenantContext.getProjectId();
        return R.ok(orderService.addonQuote(projectId, resourceType));
    }

    /** 加购下单(独立购买席位/客户配额,不换套餐;唯一待支付) */
    @PostMapping("/order/addon")
    public R<OrderVO> createAddonOrder(@RequestBody CreateAddonOrderCmd cmd) {
        Long projectId = TenantContext.getProjectId();
        return R.ok(orderService.createAddonOrder(projectId, cmd));
    }

    /** 当前待支付订单(下单弹窗回显;无则 data 为 null) */
    @GetMapping("/order/pending")
    public R<OrderVO> pendingOrder() {
        Long projectId = TenantContext.getProjectId();
        return R.ok(orderService.pendingOrder(projectId));
    }

    /** 余额核销开通 */
    @PostMapping("/order/pay")
    public R<OrderVO> payOrder(@RequestParam Long orderId) {
        Long projectId = TenantContext.getProjectId();
        return R.ok(orderService.payOrder(projectId, orderId));
    }

    /** 取消待支付订单 */
    @PostMapping("/order/cancel")
    public R<Void> cancelOrder(@RequestParam Long orderId) {
        Long projectId = TenantContext.getProjectId();
        orderService.cancelOrder(projectId, orderId);
        return R.ok();
    }

    /** 订单记录(分页,倒序;支持类型/状态/日期范围/订单号筛选) */
    @GetMapping("/orders")
    public R<PageResult<OrderVO>> orders(@RequestParam(defaultValue = "1") long current,
                                         @RequestParam(defaultValue = "10") long size,
                                         @RequestParam(required = false) String type,
                                         @RequestParam(required = false) Integer status,
                                         @RequestParam(required = false) String orderNo,
                                         @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
                                         @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo) {
        Long projectId = TenantContext.getProjectId();
        OrderQuery query = new OrderQuery(current, size, type, status, orderNo, dateFrom, dateTo);
        return R.ok(orderService.pageOrders(projectId, query));
    }

    /**
     * 资源用量(席位/客户 已用 vs 总量)。已用=真实计量(启用成员数/客户数)。
     * <p>席位=套餐 seat 配额 + 加购席位(套餐驱动)。
     * <p>客户配额=「默认值(参数 default_customer)+ 加购客户配额」(拓展包模型:不买只有默认值,不走套餐无限)。
     */
    @GetMapping("/usage")
    public R<List<UsageVO>> usage() {
        Long projectId = TenantContext.getProjectId();
        long seatUsed = memberService.countActiveMembers(projectId);
        long customerUsed = customerService.countByProject(projectId);

        long seatLimit = 0;
        boolean seatUnlimited = false;
        int extraCustomers = 0;
        BilSubscription sub = billingService.getSubscription(projectId);
        if (sub != null) {
            PlanVO plan = planService.get(sub.getPlanId());
            int extraSeats = sub.getSeats() == null ? 0 : sub.getSeats();
            extraCustomers = sub.getExtraCustomers() == null ? 0 : sub.getExtraCustomers();
            for (PlanQuotaVO q : (plan == null ? List.<PlanQuotaVO>of() : plan.quotas())) {
                if ("seat".equals(q.resourceType())) {
                    seatUnlimited = q.isUnlimited() != null && q.isUnlimited() == 1;
                    seatLimit = (q.amount() == null ? 0 : q.amount()) + extraSeats; // 套餐席位 + 加购席位
                }
            }
        }
        // 客户配额=默认值(参数)+ 加购客户配额(拓展包模型);未订阅项目 extraCustomers=0,只有默认值
        long customerLimit = configService.getInt("default_customer", 100) + extraCustomers;

        List<UsageVO> list = new ArrayList<>();
        list.add(new UsageVO("seat", seatUsed, seatLimit, seatUnlimited));
        list.add(new UsageVO("customer", customerUsed, customerLimit, false));
        return R.ok(list);
    }
}
