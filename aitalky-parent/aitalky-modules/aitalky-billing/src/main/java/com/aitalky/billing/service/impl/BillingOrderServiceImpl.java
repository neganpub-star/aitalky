package com.aitalky.billing.service.impl;

import com.aitalky.billing.config.BillingProperties;
import com.aitalky.billing.entity.BilOrder;
import com.aitalky.billing.entity.BilSubscription;
import com.aitalky.billing.entity.BilWallet;
import com.aitalky.billing.mapper.BilOrderMapper;
import com.aitalky.billing.mapper.BilSubscriptionMapper;
import com.aitalky.billing.mapper.BilWalletMapper;
import com.aitalky.billing.service.BillingOrderService;
import com.aitalky.billing.service.QuotaService;
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
import com.aitalky.platform.service.ConfigService;
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
import java.util.Map;
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
    private final ConfigService configService;
    private final BillingProperties properties;
    private final DistributedLockTemplate lockTemplate;
    private final TransactionTemplate txTemplate;
    private final QuotaService quotaService;

    /** 永久加量包资源类型(免订阅购买,配额发放到 bil_project_resource) */
    private static final java.util.Set<String> PACK_TYPES = java.util.Set.of("customer", "translate_char", "ai_tokens");

    public BillingOrderServiceImpl(BilOrderMapper orderMapper,
                                   BilSubscriptionMapper subscriptionMapper,
                                   BilWalletMapper walletMapper,
                                   PlanService planService,
                                   AddonService addonService,
                                   ConfigService configService,
                                   BillingProperties properties,
                                   DistributedLockTemplate lockTemplate,
                                   QuotaService quotaService,
                                   PlatformTransactionManager txManager) {
        this.orderMapper = orderMapper;
        this.subscriptionMapper = subscriptionMapper;
        this.walletMapper = walletMapper;
        this.planService = planService;
        this.configService = configService;
        this.addonService = addonService;
        this.properties = properties;
        this.lockTemplate = lockTemplate;
        this.quotaService = quotaService;
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
        // 续费/升级:已购加购席位不能减少(有效订阅时,新加购席位 ≥ 当前订阅加购席位)
        BilSubscription curSub = activeSubscription(projectId);
        if (curSub != null && seats < (curSub.getSeats() == null ? 0 : curSub.getSeats())) {
            throw new BizException(ResultCode.PARAM_INVALID);
        }
        // 金额 = (套餐月价 + 加购席位数 × 单席位月价) × 月数
        BigDecimal seatUnit = seatUnitMonthlyPrice();
        if (seats > 0 && seatUnit.signum() <= 0) {
            // 未配置席位加量包却要加购席位
            throw new BizException(ResultCode.PARAM_INVALID);
        }
        BigDecimal monthly = plan.monthlyPrice().add(seatUnit.multiply(BigDecimal.valueOf(seats)));
        // 合计 = (套餐+席位)×月数 + 搭售加量包(一次性);包份数序列化留待核销发放
        String addonPacks = buildAddonPacks(cmd.packs());
        BigDecimal amount = monthly.multiply(BigDecimal.valueOf(months)).add(addonPacksAmount(cmd.packs()));

        String payCurrency = requireCurrency(cmd.currency());
        String type = decideType(projectId, plan.id());

        // 唯一待支付:已有待支付单则拒绝(需先支付/取消),不再自动作废
        return lockTemplate.execute("lock:bil:order:" + projectId, 5, 10, () -> {
            ensureNoPending(projectId);
            BilOrder order = new BilOrder();
            order.setOrderNo(genOrderNo());
            order.setProjectId(projectId);
            order.setType(type);
            order.setPlanId(plan.id());
            order.setPlanName(plan.name());
            order.setMonths(months);
            order.setSeats(seats);
            order.setQuantity(0);
            order.setAddonPacks(addonPacks);
            order.setPeriodDays(0);
            order.setAmount(amount);
            order.setCurrency("USDT");
            order.setPayCurrency(payCurrency);
            order.setStatus(0);
            order.setExpireTime(LocalDateTime.now().plusHours(configService.getInt("order_expire_hours", 24))); // 24h 支付有效期
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
        boolean isSeat = "seat".equals(resourceType);
        boolean isPack = PACK_TYPES.contains(resourceType);
        if (qty <= 0 || (!isSeat && !isPack)) {
            throw new BizException(ResultCode.PARAM_INVALID);
        }
        String payCurrency = requireCurrency(cmd.currency());
        // 席位加购必须有有效订阅(按剩余周期折算、随订阅到期);永久加量包免订阅
        BilSubscription sub = activeSubscription(projectId);
        if (isSeat && sub == null) {
            throw new BizException(ResultCode.BILLING_SUBSCRIPTION_REQUIRED);
        }

        BilOrder order = new BilOrder();
        order.setProjectId(projectId);
        order.setResourceType(resourceType);
        order.setPayCurrency(payCurrency);
        order.setPlanId(sub != null ? sub.getPlanId() : 0L);     // 扩展包无套餐时置 0
        order.setPlanName(sub != null ? sub.getPlanName() : "");
        order.setMonths(0);
        order.setSeats(0);
        order.setQuantity(0);
        order.setPeriodDays(0);
        order.setCurrency("USDT");

        if (isSeat) {
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
            // 永久加量包(客户/翻译/Tokens):每包价 × 包数;发放配额 = 每包规格 × 包数
            AddonVO pack = packOf(resourceType);
            if (pack == null) {
                throw new BizException(ResultCode.BILLING_ADDON_UNAVAILABLE);
            }
            long quota = pack.specAmount() * (long) qty;
            order.setType(addonType(resourceType));
            order.setQuantity((int) quota);
            order.setAmount(pack.price().multiply(BigDecimal.valueOf(qty)).setScale(2, RoundingMode.HALF_UP));
        }

        // 唯一待支付:已有待支付单则拒绝(需先支付/取消)
        return lockTemplate.execute("lock:bil:order:" + projectId, 5, 10, () -> {
            ensureNoPending(projectId);
            order.setOrderNo(genOrderNo());
            order.setStatus(0);
            order.setExpireTime(LocalDateTime.now().plusHours(configService.getInt("order_expire_hours", 24)));
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
        if (PACK_TYPES.contains(resourceType)) {
            // 永久加量包(客户/翻译/Tokens):每包价 + 每包规格;免订阅
            AddonVO pack = packOf(resourceType);
            BigDecimal price = pack == null ? BigDecimal.ZERO : pack.price();
            Long packAmount = pack == null ? 0L : pack.specAmount();
            return new AddonQuoteVO(resourceType, subscribed, price, packAmount, null, null);
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
        // 核销前校验订单签名:防数据库被直接篡改金额/资源(签名覆盖 amount/seats/quantity/addonPacks 等关键字段)
        if (!orderSign(order).equals(order.getSign())) {
            log.error("订单签名校验失败,疑似篡改,拒绝核销, projectId={}, orderNo={}, amount={}",
                    projectId, order.getOrderNo(), order.getAmount());
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
        // 订阅/续费/升级单搭售的永久加量包(若有)先发放(与订阅状态无关)
        grantBundledPacks(projectId, order);
        // 加购:只加配额、不改套餐/到期日
        if (type != null && type.startsWith("addon_")) {
            if ("addon_seat".equals(type)) {
                // 席位随订阅:加到订阅行(下单时已校验有订阅)
                BilSubscription sub = subscriptionMapper.selectOne(Wrappers.<BilSubscription>lambdaQuery()
                        .eq(BilSubscription::getProjectId, projectId).last("limit 1"));
                if (sub == null) {
                    log.warn("席位加购核销时订阅不存在, projectId={}, orderNo={}", projectId, order.getOrderNo());
                    return;
                }
                sub.setSeats((sub.getSeats() == null ? 0 : sub.getSeats()) + order.getSeats());
                subscriptionMapper.updateById(sub);
            } else {
                // 永久加量包(客户/翻译/Tokens):发放到项目级永久配额表(脱离订阅)
                quotaService.grantPack(projectId, order.getResourceType(), order.getQuantity());
            }
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

    /** 搭售加量包合计金额 = Σ 每包价 × 包数;校验类型/上架 */
    private BigDecimal addonPacksAmount(Map<String, Integer> packs) {
        if (packs == null || packs.isEmpty()) {
            return BigDecimal.ZERO;
        }
        BigDecimal sum = BigDecimal.ZERO;
        for (Map.Entry<String, Integer> e : packs.entrySet()) {
            int cnt = e.getValue() == null ? 0 : e.getValue();
            if (cnt <= 0) {
                continue;
            }
            if (!PACK_TYPES.contains(e.getKey())) {
                throw new BizException(ResultCode.PARAM_INVALID);
            }
            AddonVO pack = packOf(e.getKey());
            if (pack == null) {
                throw new BizException(ResultCode.BILLING_ADDON_UNAVAILABLE);
            }
            sum = sum.add(pack.price().multiply(BigDecimal.valueOf(cnt)));
        }
        return sum;
    }

    /** 搭售加量包序列化 resourceType:包数,逗号分隔;无则 null */
    private String buildAddonPacks(Map<String, Integer> packs) {
        if (packs == null || packs.isEmpty()) {
            return null;
        }
        StringBuilder sb = new StringBuilder();
        for (Map.Entry<String, Integer> e : packs.entrySet()) {
            int cnt = e.getValue() == null ? 0 : e.getValue();
            if (cnt <= 0) {
                continue;
            }
            if (sb.length() > 0) {
                sb.append(",");
            }
            sb.append(e.getKey()).append(":").append(cnt);
        }
        return sb.length() == 0 ? null : sb.toString();
    }

    /** 发放订阅/续费单搭售的加量包(永久,核销内调) */
    private void grantBundledPacks(Long projectId, BilOrder order) {
        String packs = order.getAddonPacks();
        if (packs == null || packs.isBlank()) {
            return;
        }
        for (String seg : packs.split(",")) {
            String[] kv = seg.split(":");
            if (kv.length != 2) {
                continue;
            }
            String resourceType = kv[0].trim();
            int cnt;
            try {
                cnt = Integer.parseInt(kv[1].trim());
            } catch (NumberFormatException ex) {
                continue;
            }
            AddonVO pack = packOf(resourceType);
            if (pack != null && cnt > 0) {
                quotaService.grantPack(projectId, resourceType, pack.specAmount() * (long) cnt);
            }
        }
    }

    /** 指定资源类型上架的加量包(取第一条);无返回 null */
    private AddonVO packOf(String resourceType) {
        return addonService.list().stream()
                .filter(a -> resourceType.equals(a.resourceType()) && a.status() != null && a.status() == 1)
                .filter(a -> a.specAmount() != null && a.specAmount() > 0 && a.price() != null)
                .findFirst()
                .orElse(null);
    }

    /** 永久加量包资源类型 → 订单类型 */
    private static String addonType(String resourceType) {
        return switch (resourceType) {
            case "customer" -> "addon_customer";
            case "translate_char" -> "addon_translate";
            case "ai_tokens" -> "addon_tokens";
            default -> "addon_pack";
        };
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

    /** 收款网络必填校验(具体币种合法性在取地址时由 BillingAddressService 校验) */
    private static String requireCurrency(String currency) {
        if (currency == null || currency.isBlank()) {
            throw new BizException(ResultCode.PARAM_INVALID);
        }
        return currency.trim();
    }

    /** 已有待支付订单则拒绝(同项目同时仅允许一个待支付;在 lock:bil:order 内调用) */
    private void ensureNoPending(Long projectId) {
        Long count = orderMapper.selectCount(Wrappers.<BilOrder>lambdaQuery()
                .eq(BilOrder::getProjectId, projectId)
                .eq(BilOrder::getStatus, 0));
        if (count != null && count > 0) {
            throw new BizException(ResultCode.BILLING_HAS_PENDING_ORDER);
        }
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
        // 纯数字订单号(时间戳+3位随机),不加 BIL 前缀(对齐现网,前端直接展示/搜索一致)
        return LocalDateTime.now().format(ORDER_NO_FMT)
                + String.format("%03d", ThreadLocalRandom.current().nextInt(1000));
    }

    private String orderSign(BilOrder o) {
        String data = String.join("|", o.getOrderNo(), String.valueOf(o.getProjectId()),
                o.getAmount().stripTrailingZeros().toPlainString(), String.valueOf(o.getMonths()),
                String.valueOf(o.getSeats()), String.valueOf(o.getPlanId()),
                String.valueOf(o.getType()), String.valueOf(o.getResourceType()),
                String.valueOf(o.getQuantity()), String.valueOf(o.getPeriodDays()),
                String.valueOf(o.getPayCurrency()), String.valueOf(o.getAddonPacks()));
        return HmacUtil.hmacSha256Hex(properties.signKey(), data);
    }

    /** 与充值入账一致的钱包行签名原文(projectId|余额) */
    private static String walletSignData(Long projectId, BigDecimal balance) {
        return projectId + "|" + balance.stripTrailingZeros().toPlainString();
    }

    private OrderVO toVO(BilOrder o) {
        return new OrderVO(o.getId(), o.getOrderNo(), o.getType(), o.getResourceType(), o.getPlanId(), o.getPlanName(),
                o.getMonths(), o.getSeats(), o.getQuantity(), o.getAddonPacks(), o.getPeriodDays(), o.getAmount(), o.getCurrency(), o.getPayCurrency(), o.getStatus(),
                o.getExpireTime(), o.getPaidTime(), o.getCreateTime());
    }
}
