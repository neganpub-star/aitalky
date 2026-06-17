package com.aitalky.billing.entity;

import com.aitalky.framework.mybatis.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 币种/链配置:一条=一个可充值的"渠道+链+代币"。数据驱动，加币种只插数据不改代码。
 * <p>chain_id/token_id 为 Coinly 侧标识，联调时按 /v1/coins 校正。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("bil_coin")
public class BilCoin extends BaseEntity {

    private String channel;
    /** 币种符号，如 USDT */
    private String symbol;
    /** 币种全称(展示/回调比对)，如 USDT-TRC20 */
    private String currency;
    /** 网络标识(下单选网络)，如 TRC20/ERC20 */
    private String network;
    /** Coinly 链id(建址/回调用) */
    private String chainId;
    /** 链名称(展示)，如 Tron/Ethereum */
    private String chainName;
    /** Coinly 代币id(回调比对用) */
    private String tokenId;
    private Integer decimals;
    private Integer sort;
    /** 1启用 0停用 */
    private Integer status;
}
