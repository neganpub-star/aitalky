package com.aitalky.billing.service.dto;

/**
 * 币种配置(后管展示,含停用项)。
 */
public record CoinAdminVO(
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
