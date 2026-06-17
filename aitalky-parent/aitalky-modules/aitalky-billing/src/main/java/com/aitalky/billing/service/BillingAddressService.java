package com.aitalky.billing.service;

import com.aitalky.billing.service.dto.CoinVO;
import com.aitalky.billing.service.dto.RechargeAddressVO;

import java.util.List;

/** 收款地址:可充值币种列表 + 项目每链固定地址(按需创建)。 */
public interface BillingAddressService {

    /** 启用的可充值币种(按 sort 升序) */
    List<CoinVO> listCoins();

    /**
     * 取项目在指定币种所属链上的固定收款地址，不存在则向渠道申请并加密入库。
     * <p>项目每链一个地址(uk project_id+chain_id);并发用 chain 维度锁保证只建一次。
     *
     * @param projectId 项目id
     * @param currency  币种全称(对应 bil_coin.currency)
     */
    RechargeAddressVO getOrCreateAddress(Long projectId, String currency);
}
