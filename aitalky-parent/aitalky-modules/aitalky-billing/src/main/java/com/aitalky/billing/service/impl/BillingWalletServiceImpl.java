package com.aitalky.billing.service.impl;

import com.aitalky.billing.channel.coinly.CoinlySigner;
import com.aitalky.billing.config.BillingProperties;
import com.aitalky.billing.entity.BilAddress;
import com.aitalky.billing.entity.BilRecharge;
import com.aitalky.billing.entity.BilWallet;
import com.aitalky.billing.mapper.BilAddressMapper;
import com.aitalky.billing.mapper.BilRechargeMapper;
import com.aitalky.billing.mapper.BilWalletMapper;
import com.aitalky.billing.service.BillingOrderService;
import com.aitalky.billing.service.BillingWalletService;
import com.aitalky.common.api.ResultCode;
import com.aitalky.common.exception.BizException;
import com.aitalky.common.util.DigestUtil;
import com.aitalky.framework.lock.DistributedLockTemplate;
import com.aitalky.framework.security.HmacUtil;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.util.Map;
import java.util.Optional;

/**
 * 项目钱包实现。回调入账并发四重防护:
 * 验签 → txid 幂等 → 项目锁(lock:bil:wallet:{pid}) → 事务内原子自增(version 乐观锁条件)。
 * 余额/流水关键字段写入行级 HMAC(sign)防改库。
 */
@Slf4j
@Service
public class BillingWalletServiceImpl implements BillingWalletService {

    private final BilWalletMapper walletMapper;
    private final BilRechargeMapper rechargeMapper;
    private final BilAddressMapper addressMapper;
    private final BillingProperties properties;
    private final DistributedLockTemplate lockTemplate;
    private final BillingOrderService orderService;
    private final TransactionTemplate txTemplate;

    public BillingWalletServiceImpl(BilWalletMapper walletMapper,
                                    BilRechargeMapper rechargeMapper,
                                    BilAddressMapper addressMapper,
                                    BillingProperties properties,
                                    DistributedLockTemplate lockTemplate,
                                    BillingOrderService orderService,
                                    PlatformTransactionManager txManager) {
        this.walletMapper = walletMapper;
        this.rechargeMapper = rechargeMapper;
        this.addressMapper = addressMapper;
        this.properties = properties;
        this.lockTemplate = lockTemplate;
        this.orderService = orderService;
        // 锁内用编程式事务:余额自增 + 流水写入原子提交(避免 self-invocation 导致 @Transactional 失效)
        this.txTemplate = new TransactionTemplate(txManager);
    }

    @Override
    public BigDecimal getBalance(Long projectId) {
        BilWallet wallet = walletMapper.selectOne(Wrappers.<BilWallet>lambdaQuery()
                .eq(BilWallet::getProjectId, projectId).last("limit 1"));
        return wallet == null ? BigDecimal.ZERO : wallet.getBalance();
    }

    @Override
    public void handleCoinlyCallback(Map<String, Object> params) {
        BillingProperties.Coinly cfg = properties.coinly();
        // 1) 验签(排除 sign/空值 → key 升序拼接 → apiKey 前置 → MD5)
        String sign = str(params.get("sign"));
        if (!CoinlySigner.verify(params, cfg.apiKey(), sign)) {
            log.warn("Coinly 回调验签失败, txid={}, address={}", params.get("txid"), params.get("address"));
            throw new BizException(ResultCode.BILLING_CALLBACK_SIGN_INVALID);
        }
        // 2) 仅处理成功状态(status=1),其余忽略(对账以成功到账为准)
        if (!"1".equals(str(params.get("status")))) {
            log.info("Coinly 回调非成功状态忽略, status={}, txid={}", params.get("status"), params.get("txid"));
            return;
        }
        String txid = str(params.get("txid"));
        String address = str(params.get("address"));
        if (txid.isBlank() || address.isBlank()) {
            log.warn("Coinly 回调缺少 txid/address, params={}", params);
            throw new BizException(ResultCode.PARAM_INVALID);
        }
        BigDecimal amount = new BigDecimal(str(params.get("amount")));
        // 3) 按地址 hash 反查项目(库内不存明文地址)
        String addressHash = DigestUtil.sha256Hex(address);
        BilAddress addr = addressMapper.selectOne(Wrappers.<BilAddress>lambdaQuery()
                .eq(BilAddress::getAddressHash, addressHash).last("limit 1"));
        if (addr == null) {
            log.warn("Coinly 回调地址无法反查项目, addressHash={}, txid={}", addressHash, txid);
            throw new BizException(ResultCode.BILLING_CALLBACK_ADDRESS_UNKNOWN);
        }
        Long projectId = addr.getProjectId();

        // 4) 项目锁内事务入账(同项目回调串行;txid 幂等),入账后自动核销待支付订单(闭环关键)
        String lockKey = "lock:bil:wallet:" + projectId;
        lockTemplate.execute(lockKey, 5, 10, () -> {
            txTemplate.executeWithoutResult(s -> creditInTx(projectId, amount, txid, address, params));
            // 入账事务已提交,余额已更新 → 尝试用余额核销当前待支付订单(余额够则开通,多余留兜底)
            // payOrder 重入同一 wallet 锁(Redisson 可重入),不会死锁
            orderService.autoSettlePendingOrder(projectId);
            return null;
        });
    }

    /** 事务内:txid 幂等校验 → 原子入账(version 乐观锁) → 写流水。 */
    private void creditInTx(Long projectId, BigDecimal amount, String txid, String address, Map<String, Object> params) {
        // 幂等:已入账直接跳过
        Long done = rechargeMapper.selectCount(Wrappers.<BilRecharge>lambdaQuery()
                .eq(BilRecharge::getTxid, txid));
        if (done != null && done > 0) {
            log.info("Coinly 回调重复 txid 幂等跳过, txid={}", txid);
            return;
        }
        BilWallet wallet = getOrCreateWallet(projectId);
        BigDecimal newBalance = wallet.getBalance().add(amount);
        String walletSign = HmacUtil.hmacSha256Hex(properties.signKey(), walletSignData(projectId, newBalance));
        // 原子自增 + version 乐观锁条件(持有项目锁,version 不会被并发改动)
        int rows = walletMapper.creditBalance(projectId, amount, walletSign, wallet.getVersion());
        if (rows == 0) {
            log.error("余额入账乐观锁冲突, projectId={}, version={}, txid={}", projectId, wallet.getVersion(), txid);
            throw new BizException(ResultCode.BILLING_WALLET_CREDIT_CONFLICT);
        }
        // 写流水(txid uk 幂等backstop;关键字段 HMAC 防改库)
        BilRecharge recharge = new BilRecharge();
        recharge.setProjectId(projectId);
        recharge.setAddress(address);
        recharge.setAmount(amount);
        recharge.setCurrency(str(params.get("currency")));
        recharge.setChainId(str(params.get("chain_id")));
        recharge.setTokenId(str(params.get("token_id")));
        recharge.setTxid(txid);
        recharge.setBlockHeight(str(params.get("block_height")));
        recharge.setSign(HmacUtil.hmacSha256Hex(properties.signKey(),
                rechargeSignData(txid, projectId, amount, recharge.getCurrency())));
        rechargeMapper.insert(recharge);
        log.info("充值入账完成, projectId={}, amount={}, txid={}", projectId, amount, txid);
    }

    /** 取/建项目钱包(回调无租户上下文，显式按 projectId) */
    private BilWallet getOrCreateWallet(Long projectId) {
        BilWallet wallet = walletMapper.selectOne(Wrappers.<BilWallet>lambdaQuery()
                .eq(BilWallet::getProjectId, projectId).last("limit 1"));
        if (wallet != null) {
            return wallet;
        }
        BilWallet created = new BilWallet();
        created.setProjectId(projectId);
        created.setBalance(BigDecimal.ZERO);
        created.setCurrency("USDT");
        created.setVersion(0);
        created.setSign(HmacUtil.hmacSha256Hex(properties.signKey(), walletSignData(projectId, BigDecimal.ZERO)));
        walletMapper.insert(created);
        return created;
    }

    /** 钱包行签名原文:projectId|余额(去尾零的标准串) */
    private static String walletSignData(Long projectId, BigDecimal balance) {
        return projectId + "|" + balance.stripTrailingZeros().toPlainString();
    }

    /** 流水行签名原文:txid|projectId|金额|币种 */
    private static String rechargeSignData(String txid, Long projectId, BigDecimal amount, String currency) {
        return txid + "|" + projectId + "|" + amount.stripTrailingZeros().toPlainString() + "|" + Optional.ofNullable(currency).orElse("");
    }

    private static String str(Object o) {
        return o == null ? "" : String.valueOf(o);
    }
}
