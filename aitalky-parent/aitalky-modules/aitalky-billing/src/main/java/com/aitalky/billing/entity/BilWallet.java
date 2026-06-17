package com.aitalky.billing.entity;

import com.aitalky.framework.mybatis.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;

/**
 * 项目钱包余额:充值入账、买套餐扣减(余额兜底防丢钱)。每项目一条(uk project_id)。
 * <p>并发三重防护:项目锁 + 原子 UPDATE(version 条件，见 BilWalletMapper#creditBalance) + txid 幂等;
 * sign 为关键字段 HMAC 防改库。未启用 MP 乐观锁拦截器，version 由 mapper 显式 where/自增控制。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("bil_wallet")
public class BilWallet extends BaseEntity {

    private Long projectId;
    private BigDecimal balance;
    private String currency;
    /** 乐观锁版本(由 BilWalletMapper#creditBalance 原子 where version=? + version+1 控制) */
    private Integer version;
    /** project_id+balance 的 HMAC(防改库改余额) */
    private String sign;
}
