package com.aitalky.billing.service.dto;

/**
 * 新增/编辑币种配置(id 为空=新增)。
 *
 * @param channel   支付渠道(默认 coinly)
 * @param symbol    币种符号(USDT)
 * @param currency  币种全称(USDT-TRC20,渠道+currency 唯一)
 * @param network   网络标识(TRC20)
 * @param chainId   Coinly 链id
 * @param chainName 链名称(Tron)
 * @param tokenId   Coinly 代币id(可空)
 * @param decimals  精度(默认 6)
 * @param sort      排序
 * @param status    状态 1启用 0停用
 */
public record SaveCoinCmd(
        Long id,
        String channel,
        String symbol,
        String currency,
        String network,
        String chainId,
        String chainName,
        String tokenId,
        Integer decimals,
        Integer sort,
        Integer status
) {
}
