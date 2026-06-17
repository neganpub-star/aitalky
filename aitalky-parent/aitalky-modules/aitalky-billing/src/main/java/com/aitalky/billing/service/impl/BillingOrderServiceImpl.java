package com.aitalky.billing.service.impl;

import com.aitalky.billing.config.BillingProperties;
import com.aitalky.billing.entity.BilOrder;
import com.aitalky.billing.entity.BilSubscription;
import com.aitalky.billing.entity.BilWallet;
import com.aitalky.billing.mapper.BilOrderMapper;
import com.aitalky.billing.mapper.BilSubscriptionMapper;
import com.aitalky.billing.mapper.BilWalletMapper;
import com.aitalky.billing.service.BillingOrderService;
import com.aitalky.billing.service.dto.CreateOrderCmd;
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
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
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
            order.setAmount(amount);
            order.setCurrency("USDT");
            order.setStatus(0);
            order.setSign(orderSign(order));
            orderMapper.insert(order);
            log.info("创建订单, projectId={}, orderNo={}, type={}, amount={}", projectId, order.getOrderNo(), type, amount);
            return toVO(order);
        });
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

    /** 开通/续费/升级订阅(在核销事务内)。 */
    private void activateSubscription(BilOrder order) {
        Long projectId = order.getProjectId();
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
    }

    @Override
    public PageResult<OrderVO> pageOrders(Long projectId, long current, long size) {
        Page<BilOrder> page = orderMapper.selectPage(Page.of(current, size),
                Wrappers.<BilOrder>lambdaQuery()
                        .eq(BilOrder::getProjectId, projectId)
                        .orderByDesc(BilOrder::getCreateTime));
        return PageResult.of(page.getRecords().stream().map(this::toVO).toList(),
                page.getTotal(), current, size);
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
                String.valueOf(o.getSeats()), String.valueOf(o.getPlanId()));
        return HmacUtil.hmacSha256Hex(properties.signKey(), data);
    }

    /** 与充值入账一致的钱包行签名原文(projectId|余额) */
    private static String walletSignData(Long projectId, BigDecimal balance) {
        return projectId + "|" + balance.stripTrailingZeros().toPlainString();
    }

    private OrderVO toVO(BilOrder o) {
        return new OrderVO(o.getId(), o.getOrderNo(), o.getType(), o.getPlanId(), o.getPlanName(),
                o.getMonths(), o.getSeats(), o.getAmount(), o.getCurrency(), o.getStatus(),
                o.getPaidTime(), o.getCreateTime());
    }
}
