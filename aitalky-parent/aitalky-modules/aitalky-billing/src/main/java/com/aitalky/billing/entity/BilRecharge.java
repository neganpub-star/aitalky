package com.aitalky.billing.entity;

import com.aitalky.framework.mybatis.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;

/**
 * 充值流水:Coinly 回调入账一笔一条。txid 唯一(uk)幂等防重放;sign 为关键字段 HMAC 防改库。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("bil_recharge")
public class BilRecharge extends BaseEntity {

    private Long projectId;
    /** 收款地址(明文，回调比对/对账用) */
    private String address;
    private BigDecimal amount;
    /** 币种(如 USDT-ERC20) */
    private String currency;
    private String chainId;
    private String tokenId;
    /** 交易哈希(唯一，幂等) */
    private String txid;
    private String blockHeight;
    private String sign;
}
