package com.aitalky.billing.channel;

/**
 * 支付渠道抽象:建址、(后续)余额查询等。换/加渠道只实现本接口 + 配置 channelKey，上层不改。
 * <p>当前实现:CoinlyChannel。
 */
public interface PaymentChannel {

    /** 渠道标识(对应 aitalky.billing.channel 配置，如 coinly) */
    String channelKey();

    /**
     * 在指定链上为项目创建一个收款地址。
     *
     * @param req chainId/alias/callbackUrl
     * @return 链上收款地址(明文)
     */
    String createAddress(CreateAddressReq req);

    /**
     * 建址请求。
     *
     * @param chainId     链id(对应 bil_coin.chain_id)
     * @param alias       地址别名(便于在渠道侧识别归属，如 project:{id})
     * @param callbackUrl 充值到账回调地址
     */
    record CreateAddressReq(String chainId, String alias, String callbackUrl) {
    }
}
