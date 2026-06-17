package com.aitalky.billing.service.impl;

import com.aitalky.billing.config.BillingProperties;
import com.aitalky.billing.entity.BilOrder;
import com.aitalky.billing.entity.BilSubscription;
import com.aitalky.billing.entity.BilWallet;
import com.aitalky.billing.mapper.BilOrderMapper;
import com.aitalky.billing.mapper.BilSubscriptionMapper;
import com.aitalky.billing.mapper.BilWalletMapper;
import com.aitalky.billing.service.BillingOrderService;
import com.aitalky.billing.service.dto.AddonQuoteVO;
import com.aitalky.billing.service.dto.CreateAddonOrderCmd;
import com.aitalky.billing.service.dto.CreateOrderCmd;
import com.aitalky.billing.service.dto.OrderQuery;
import com.aitalky.billing.service.dto.OrderVO;
import com.aitalky.common.api.PageResult;
import com.aitalky.common.api.ResultCode;
import com.aitalky.common.exception.BizException;
import com.aitalky.framework.lock.DistributedLockTemplate;
import com.aitalky.framework.security.HmacUtil;
import com.aitalky.platform.dto.AddonVO;
import com.aitalky.platform.dto.PlanVO;
import com.aitalky.platform.service.AddonService;
import com.aitalky.platform.service.PlanService;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.concurrent.ThreadLocalRandom;

/**
 * 订单实现。下单(算价+类型判定+唯一待支付)与核销(余额扣减+开通订阅)是计费闭环核心。
 * <p>并发:下单用 lock:bil:order:{pid} 保证唯一待支付;核销用 lock:bil:wallet:{pid}(与充值入账互斥)
 * + 事务内原子扣款(version 乐观锁 + balance>=amount 条件)+ 订单状态条件更新(防重复核销)。
 */
@Slf4j
@Service
public class BillingOrderServiceImpl implements BillingOrderService {

    /** 一个月按 30 天计 */
    private static final long DAYS_PER_MONTH = 30L;
    private static final DateTimeFormatter ORDER_NO_FMT = DateTimeFormatter.ofPattern("yyyyMMddHHmmssSSS");

    private final BilOrderMapper orderMapper;
    private final BilSubscriptionMapper subscriptionMapper;
    private final BilWalletMapper walletMapper;
    private final PlanService planService;
    private final AddonService addonService;
    private final BillingProperties properties;
    private final DistributedLockTemplate lockTemplate;
    private final TransactionTemplate txTemplate;

    public BillingOrderServiceImpl(BilOrderMapper orderMapper,
                                   BilSubscriptionMapper subscriptionMapper,
                                   BilWalletMapper walletMapper,
                                   PlanService planService,
                                   AddonService addonService,
                                   BillingProperties properties,
                                   DistributedLockTemplate lockTemplate,
                                   PlatformTransactionManager txManager) {
        this.orderMapper = orderMapper;
        this.subscriptionMapper = subscriptionMapper;
        this.walletMapper = walletMapper;
        this.planService = planService;
        this.addonService = addonService;
        this.properties = properties;
        this.lockTemplate = lockTemplate;
        this.txTemplate = new TransactionTemplate(txManager);
    }

    @Override
    public OrderVO createOrder(Long projectId, CreateOrderCmd cmd) {
        PlanVO plan = planService.get(cmd.planId());  // 不存在抛 NOT_FOUND
        // 套餐可订阅校验:必须上架且非定制版
        if (plan.status() == null || plan.status() != 1
                || (plan.isCustom() != null && plan.isCustom() == 1)) {
            throw new BizException(ResultCode.BILLING_PLAN_UNAVAILABLE);
        }
        int minMonths = plan.minMonths() == null ? 1 : plan.minMonths();
        int months = cmd.months() == null ? 0 : cmd.months();
        if (months < minMonths) {
            throw new BizException(ResultCode.PARAM_INVALID);
        }
        int seats = cmd.seats() == null ? 0 : cmd.seats();
        if (seats < 0) {
            throw new BizException(ResultCode.PARAM_INVALID);
        }
        // 金额 = (套餐月价 + 加购席位数 × 单席位月价) × 月数
        BigDecimal seatUnit = seatUnitMonthlyPrice();
        if (seats > 0 && seatUnit.signum() <= 0) {
            // 未配置席位加量包却要加购席位
            throw new BizException(ResultCode.PARAM_INVALID);
        }
        BigDecimal monthly = plan.monthlyPrice().add(seatUnit.multiply(BigDecimal.valueOf(seats)));
        BigDecimal amount = monthly.multiply(BigDecimal.valueOf(months));

        String type = decideType(projectId, plan.id());

        // 唯一待支付:作废旧待支付单后建新单
        return lockTemplate.execute("lock:bil:order:" + projectId, 5, 10, () -> {
            orderMapper.voidPendingOrders(projectId);
            BilOrder order = new BilOrder();
            order.setOrderNo(genOrderNo());
            order.setProjectId(projectId);
            order.setType(type);
            order.setPlanId(plan.id());
            order.setPlanName(plan.name());
            order.setMonths(months);
            order.setSeats(seats);
            order.setQuantity(0);
            order.setPeriodDays(0);
            order.setAmount(amount);
            order.setCurrency("USDT");
            order.setStatus(0);
            order.setExpireTime(LocalDateTime.now().plusHours(24)); // 24h 支付有效期
            order.setSign(orderSign(order));
            orderMapper.insert(order);
            log.info("创建订单, projectId={}, orderNo={}, type={}, amount={}", projectId, order.getOrderNo(), type, amount);
            return toVO(order);
        });
    }

    @Override
    public OrderVO createAddonOrder(Long projectId, CreateAddonOrderCmd cmd) {
        String resourceType = cmd.resourceType();
        int qty = cmd.quantity() == null ? 0 : cmd.quantity();
        if (qty <= 0 || (!"seat".equals(resourceType) && !"customer".equals(resourceType))) {
            throw new BizException(ResultCode.PARAM_INVALID);
        }
        // 加购前提:必须有有效订阅(否则无周期可折算/无套餐可挂)
        BilSubscription sub = activeSubscription(projectId);
        if (sub == null) {
            throw new BizException(ResultCode.BILLING_SUBSCRIPTION_REQUIRED);
        }

        BilOrder order = new BilOrder();
        order.setProjectId(projectId);
        order.setResourceType(resourceType);
        order.setPlanId(sub.getPlanId());
        order.setPlanName(sub.getPlanName());
        order.setMonths(0);
        order.setSeats(0);
        order.setQuantity(0);
        order.setPeriodDays(0);
        order.setCurrency("USDT");

        if ("seat".equals(resourceType)) {
            // 席位加购:按剩余天数折算 = 单席位月价 × 数量 × 剩余天/30
            BigDecimal unit = seatUnitMonthlyPrice();
            if (unit.signum() <= 0) {
                throw new BizException(ResultCode.BILLING_ADDON_UNAVAILABLE);
            }
            int remainingDays = remainingDays(sub);
            order.setType("addon_seat");
            order.setSeats(qty);
            order.setPeriodDays(remainingDays);
            order.setAmount(proratedSeatAmount(unit, qty, remainingDays));
        } else {
            // 客户配额加购:永久配额包 = 每包价 × 包数;新增配额 = 每包配额 × 包数
            AddonVO pack = customerPack();
            if (pack == null) {
                throw new BizException(ResultCode.BILLING_ADDON_UNAVAILABLE);
            }
            long quota = pack.specAmount() * (long) qty;
            order.setType("addon_customer");
            order.setQuantity((int) quota);
            order.setAmount(pack.price().multiply(BigDecimal.valueOf(qty)).setScale(2, RoundingMode.HALF_UP));
        }

        // 唯一待支付:作废旧待支付单后建新单
        return lockTemplate.execute("lock:bil:order:" + projectId, 5, 10, () -> {
            orderMapper.voidPendingOrders(projectId);
            order.setOrderNo(genOrderNo());
            order.setStatus(0);
            order.setExpireTime(LocalDateTime.now().plusHours(24));
            order.setSign(orderSign(order));
            orderMapper.insert(order);
            log.info("创建加购订单, projectId={}, orderNo={}, type={}, amount={}",
                    projectId, order.getOrderNo(), order.getType(), order.getAmount());
            return toVO(order);
        });
    }

    @Override
    public AddonQuoteVO addonQuote(Long projectId, String resourceType) {
        BilSubscription sub = activeSubscription(projectId);
        boolean subscribed = sub != null;
        if ("customer".equals(resourceType)) {
            AddonVO pack = customerPack();
            BigDecimal price = pack == null ? BigDecimal.ZERO : pack.price();
            Long packAmount = pack == null ? 0L : pack.specAmount();
            return new AddonQuoteVO("customer", subscribed, price, packAmount, null, null);
        }
        // 默认席位
        Integer remainingDays = subscribed ? remainingDays(sub) : null;
        LocalDateTime expire = subscribed ? sub.getExpireTime() : null;
        return new AddonQuoteVO("seat", subscribed, seatUnitMonthlyPrice(), 1L, remainingDays, expire);
    }

    @Override
    public OrderVO pendingOrder(Long projectId) {
        BilOrder order = orderMapper.selectOne(Wrappers.<BilOrder>lambdaQuery()
                .eq(BilOrder::getProjectId, projectId)
                .eq(BilOrder::getStatus, 0)
                .orderByDesc(BilOrder::getCreateTime)
                .last("limit 1"));
        return order == null ? null : toVO(order);
    }

    @Override
    public void cancelOrder(Long projectId, Long orderId) {
        lockTemplate.execute("lock:bil:order:" + projectId, 5, 10, () -> {
            int rows = orderMapper.cancelOne(orderId, projectId);
            if (rows == 0) {
                throw new BizException(ResultCode.BILLING_ORDER_NOT_PAYABLE);
            }
            log.info("取消订单, projectId={}, orderId={}", projectId, orderId);
            return null;
        });
    }

    @Override
    public OrderVO payOrder(Long projectId, Long orderId) {
        return lockTemplate.execute("lock:bil:wallet:" + projectId, 5, 10, () ->
                txTemplate.execute(s -> doPay(projectId, orderId)));
    }

    /** 事务内核销:校验→扣余额(原子)→订单完成(状态条件)→开通订阅。 */
    private OrderVO doPay(Long projectId, Long orderId) {
        BilOrder order = orderMapper.selectOne(Wrappers.<BilOrder>lambdaQuery()
                .eq(BilOrder::getId, orderId)
                .eq(BilOrder::getProjectId, projectId)
                .last("limit 1"));
        if (order == null || order.getStatus() == null || order.getStatus() != 0) {
            throw new BizException(ResultCode.BILLING_ORDER_NOT_PAYABLE);
        }
        BigDecimal amount = order.getAmount();
        // 余额核销(amount>0 才扣;0 元单直接开通)
        if (amount.signum() > 0) {
            BilWallet wallet = walletMapper.selectOne(Wrappers.<BilWallet>lambdaQuery()
                    .eq(BilWallet::getProjectId, projectId).last("limit 1"));
            if (wallet == null || wallet.getBalance().compareTo(amount) < 0) {
                throw new BizException(ResultCode.BILLING_BALANCE_INSUFFICIENT);
            }
            BigDecimal newBalance = wallet.getBalance().subtract(amount);
            String walletSign = HmacUtil.hmacSha256Hex(properties.signKey(), walletSignData(projectId, newBalance));
            int rows = walletMapper.debitBalance(projectId, amount, walletSign, wallet.getVersion());
            if (rows == 0) {
                // 余额不足或并发冲突
                throw new BizException(ResultCode.BILLING_BALANCE_INSUFFICIENT);
            }
        }
        // 订单完成(状态条件更新,0行=已被支付/作废)
        int paid = orderMapper.markPaid(orderId, projectId);
        if (paid == 0) {
            throw new BizException(ResultCode.BILLING_ORDER_NOT_PAYABLE);
        }
        activateSubscription(order);
        log.info("订单核销开通完成, projectId={}, orderNo={}, amount={}", projectId, order.getOrderNo(), amount);
        // 回读最新状态
        return toVO(orderMapper.selectById(orderId));
    }

    /** 开通/续费/升级/加购订阅(在核销事务内)。 */
    private void activateSubscription(BilOrder order) {
        Long projectId = order.getProjectId();
        String type = order.getType();
        // 加购:只加配额、不改套餐/到期日(剩余周期内即时生效)
        if ("addon_seat".equals(type) || "addon_customer".equals(type)) {
            BilSubscription sub = subscriptionMapper.selectOne(Wrappers.<BilSubscription>lambdaQuery()
                    .eq(BilSubscription::getProjectId, projectId).last("limit 1"));
            if (sub == null) {
                // 加购下单时校验过有订阅;理论不达,保险起见忽略(钱已扣留余额可联系客服)
                log.warn("加购核销时订阅不存在, projectId={}, orderNo={}", projectId, order.getOrderNo());
                return;
            }
            if ("addon_seat".equals(type)) {
                sub.setSeats((sub.getSeats() == null ? 0 : sub.getSeats()) + order.getSeats());
            } else {
                sub.setExtraCustomers((sub.getExtraCustomers() == null ? 0 : sub.getExtraCustomers()) + order.getQuantity());
            }
            subscriptionMapper.updateById(sub);
            return;
        }

        PlanVO plan = planService.get(order.getPlanId());
        long days = DAYS_PER_MONTH * order.getMonths();
        LocalDateTime now = LocalDateTime.now();

        BilSubscription sub = subscriptionMapper.selectOne(Wrappers.<BilSubscription>lambdaQuery()
                .eq(BilSubscription::getProjectId, projectId).last("limit 1"));
        if (sub == null) {
            BilSubscription ns = new BilSubscription();
            ns.setProjectId(projectId);
            applyPlan(ns, plan, order.getSeats());
            // 生效次日 0 点起算(对齐 V19 设计)
            LocalDateTime start = LocalDate.now().plusDays(1).atStartOfDay();
            ns.setStartTime(start);
            ns.setExpireTime(start.plusDays(days));
            ns.setStatus(1);
            subscriptionMapper.insert(ns);
            return;
        }
        boolean active = sub.getStatus() != null && sub.getStatus() == 1
                && sub.getExpireTime() != null && sub.getExpireTime().isAfter(now);
        if ("renew".equals(order.getType()) && active && sub.getPlanId().equals(order.getPlanId())) {
            // 续费:在原到期时间上叠加;席位以本次为准
            sub.setExpireTime(sub.getExpireTime().plusDays(days));
            sub.setSeats(order.getSeats());
            sub.setStatus(1);
        } else {
            // 升级 / 过期后重新购买:换套餐,从次日重新起算(MVP 不做差价折算)
            applyPlan(sub, plan, order.getSeats());
            LocalDateTime start = LocalDate.now().plusDays(1).atStartOfDay();
            sub.setStartTime(start);
            sub.setExpireTime(start.plusDays(days));
            sub.setStatus(1);
        }
        subscriptionMapper.updateById(sub);
    }

    private void applyPlan(BilSubscription sub, PlanVO plan, Integer seats) {
        sub.setPlanId(plan.id());
        sub.setPlanCode(plan.code());
        sub.setPlanName(plan.name());
        sub.setSeats(seats == null ? 0 : seats);
        // 换套餐(新购/升级/过期重购):加购客户配额不跨套餐保留,重置为0(续费走另一分支,不重置)
        sub.setExtraCustomers(0);
    }

    @Override
    public PageResult<OrderVO> pageOrders(Long projectId, OrderQuery query) {
        var wrapper = Wrappers.<BilOrder>lambdaQuery()
                .eq(BilOrder::getProjectId, projectId)
                .eq(query.type() != null && !query.type().isBlank(), BilOrder::getType, query.type())
                .eq(query.status() != null, BilOrder::getStatus, query.status())
                .likeRight(query.orderNo() != null && !query.orderNo().isBlank(), BilOrder::getOrderNo, query.orderNo() == null ? "" : query.orderNo().trim())
                .ge(query.dateFrom() != null, BilOrder::getCreateTime, query.dateFrom() == null ? null : query.dateFrom().atStartOfDay())
                .lt(query.dateTo() != null, BilOrder::getCreateTime, query.dateTo() == null ? null : query.dateTo().plusDays(1).atStartOfDay())
                .orderByDesc(BilOrder::getCreateTime);
        Page<BilOrder> page = orderMapper.selectPage(Page.of(query.current(), query.size()), wrapper);
        return PageResult.of(page.getRecords().stream().map(this::toVO).toList(),
                page.getTotal(), query.current(), query.size());
    }

    @Override
    public void autoSettlePendingOrder(Long projectId) {
        // 取最早的待支付订单(一项目同时仅一个待支付)
        BilOrder order = orderMapper.selectOne(Wrappers.<BilOrder>lambdaQuery()
                .eq(BilOrder::getProjectId, projectId)
                .eq(BilOrder::getStatus, 0)
                .orderByAsc(BilOrder::getCreateTime)
                .last("limit 1"));
        if (order == null) {
            return;
        }
        BilWallet wallet = walletMapper.selectOne(Wrappers.<BilWallet>lambdaQuery()
                .eq(BilWallet::getProjectId, projectId).last("limit 1"));
        // 余额不足(分批到账/金额对不上):不核销,钱留余额兜底,等后续到账凑够
        if (wallet == null || wallet.getBalance().compareTo(order.getAmount()) < 0) {
            log.info("到账后余额不足以核销待支付订单,留余额兜底, projectId={}, orderNo={}", projectId, order.getOrderNo());
            return;
        }
        try {
            payOrder(projectId, order.getId()); // 复用核销逻辑(自带锁,回调线程重入同锁)
        } catch (BizException e) {
            // 并发/状态变更等,记录不抛(回调入账已成功,核销失败可由下次到账或查询时重试)
            log.warn("到账自动核销订单失败, projectId={}, orderNo={}, code={}", projectId, order.getOrderNo(), e.getCode());
        }
    }

    @Override
    public BigDecimal seatMonthlyPrice() {
        return seatUnitMonthlyPrice();
    }

    /** 单席位月价 = 席位加量包 price / specAmount;无配置返回 0 */
    private BigDecimal seatUnitMonthlyPrice() {
        return addonService.list().stream()
                .filter(a -> "seat".equals(a.resourceType()) && a.status() != null && a.status() == 1)
                .filter(a -> a.specAmount() != null && a.specAmount() > 0 && a.price() != null)
                .findFirst()
                .map(a -> a.price().divide(BigDecimal.valueOf(a.specAmount())))
                .orElse(BigDecimal.ZERO);
    }

    /** 客户拓展包(上架的 customer 加量包;取第一条);无返回 null */
    private AddonVO customerPack() {
        return addonService.list().stream()
                .filter(a -> "customer".equals(a.resourceType()) && a.status() != null && a.status() == 1)
                .filter(a -> a.specAmount() != null && a.specAmount() > 0 && a.price() != null)
                .findFirst()
                .orElse(null);
    }

    /** 当前有效订阅(status=1 且未到期);无返回 null */
    private BilSubscription activeSubscription(Long projectId) {
        BilSubscription sub = subscriptionMapper.selectOne(Wrappers.<BilSubscription>lambdaQuery()
                .eq(BilSubscription::getProjectId, projectId).last("limit 1"));
        boolean active = sub != null && sub.getStatus() != null && sub.getStatus() == 1
                && sub.getExpireTime() != null && sub.getExpireTime().isAfter(LocalDateTime.now());
        return active ? sub : null;
    }

    /** 订阅剩余天数(向上取整,至少1天;到期后为0) */
    private int remainingDays(BilSubscription sub) {
        if (sub.getExpireTime() == null) {
            return 0;
        }
        long minutes = ChronoUnit.MINUTES.between(LocalDateTime.now(), sub.getExpireTime());
        if (minutes <= 0) {
            return 0;
        }
        return (int) Math.max(1, Math.ceil(minutes / (60.0 * 24)));
    }

    /** 席位加购金额 = 单席位月价 × 数量 × 剩余天/30(2位小数,四舍五入) */
    private BigDecimal proratedSeatAmount(BigDecimal seatUnit, int qty, int remainingDays) {
        return seatUnit.multiply(BigDecimal.valueOf(qty))
                .multiply(BigDecimal.valueOf(remainingDays))
                .divide(BigDecimal.valueOf(DAYS_PER_MONTH), 2, RoundingMode.HALF_UP);
    }

    /** 判定订单类型:无有效订阅=new;同套餐=renew;异套餐=upgrade */
    private String decideType(Long projectId, Long planId) {
        BilSubscription sub = subscriptionMapper.selectOne(Wrappers.<BilSubscription>lambdaQuery()
                .eq(BilSubscription::getProjectId, projectId).last("limit 1"));
        boolean active = sub != null && sub.getStatus() != null && sub.getStatus() == 1
                && sub.getExpireTime() != null && sub.getExpireTime().isAfter(LocalDateTime.now());
        if (!active) {
            return "new";
        }
        return sub.getPlanId().equals(planId) ? "renew" : "upgrade";
    }

    private String genOrderNo() {
        return "BIL" + LocalDateTime.now().format(ORDER_NO_FMT)
                + String.format("%03d", ThreadLocalRandom.current().nextInt(1000));
    }

    private String orderSign(BilOrder o) {
        String data = String.join("|", o.getOrderNo(), String.valueOf(o.getProjectId()),
                o.getAmount().stripTrailingZeros().toPlainString(), String.valueOf(o.getMonths()),
                String.valueOf(o.getSeats()), String.valueOf(o.getPlanId()),
                String.valueOf(o.getType()), String.valueOf(o.getResourceType()),
                String.valueOf(o.getQuantity()), String.valueOf(o.getPeriodDays()));
        return HmacUtil.hmacSha256Hex(properties.signKey(), data);
    }

    /** 与充值入账一致的钱包行签名原文(projectId|余额) */
    private static String walletSignData(Long projectId, BigDecimal balance) {
        return projectId + "|" + balance.stripTrailingZeros().toPlainString();
    }

    private OrderVO toVO(BilOrder o) {
        return new OrderVO(o.getId(), o.getOrderNo(), o.getType(), o.getResourceType(), o.getPlanId(), o.getPlanName(),
                o.getMonths(), o.getSeats(), o.getQuantity(), o.getPeriodDays(), o.getAmount(), o.getCurrency(), o.getStatus(),
                o.getExpireTime(), o.getPaidTime(), o.getCreateTime());
    }
}
