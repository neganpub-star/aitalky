package com.aitalky.billing.service.impl;

import com.aitalky.billing.channel.PaymentChannel;
import com.aitalky.billing.channel.PaymentChannelRegistry;
import com.aitalky.billing.config.BillingProperties;
import com.aitalky.billing.entity.BilAddress;
import com.aitalky.billing.entity.BilCoin;
import com.aitalky.billing.mapper.BilAddressMapper;
import com.aitalky.billing.mapper.BilCoinMapper;
import com.aitalky.billing.service.BillingAddressService;
import com.aitalky.billing.service.dto.CoinVO;
import com.aitalky.billing.service.dto.RechargeAddressVO;
import com.aitalky.common.api.ResultCode;
import com.aitalky.common.exception.BizException;
import com.aitalky.common.util.DigestUtil;
import com.aitalky.framework.lock.DistributedLockTemplate;
import com.aitalky.framework.security.AesGcmUtil;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 收款地址实现。项目每链一个固定地址(uk project_id+chain_id):
 * chain 维度分布式锁内"查→无则向渠道建址→AES 加密入库"，保证并发只建一次、库内不存明文。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class BillingAddressServiceImpl implements BillingAddressService {

    private final BilCoinMapper coinMapper;
    private final BilAddressMapper addressMapper;
    private final PaymentChannelRegistry channelRegistry;
    private final BillingProperties properties;
    private final DistributedLockTemplate lockTemplate;

    @Override
    public List<CoinVO> listCoins() {
        return coinMapper.selectList(Wrappers.<BilCoin>lambdaQuery()
                        .eq(BilCoin::getStatus, 1)
                        .orderByAsc(BilCoin::getSort)).stream()
                .map(c -> new CoinVO(c.getSymbol(), c.getCurrency(), c.getNetwork(), c.getChainName()))
                .toList();
    }

    @Override
    public RechargeAddressVO getOrCreateAddress(Long projectId, String currency) {
        BilCoin coin = coinMapper.selectOne(Wrappers.<BilCoin>lambdaQuery()
                .eq(BilCoin::getCurrency, currency)
                .eq(BilCoin::getStatus, 1)
                .last("limit 1"));
        if (coin == null) {
            throw new BizException(ResultCode.BILLING_COIN_NOT_SUPPORTED);
        }
        // chain 维度锁:同项目同链并发请求只建一个地址
        String lockKey = "lock:bil:addr:" + projectId + ":" + coin.getChainId();
        String address = lockTemplate.execute(lockKey, 5, 10, () -> resolveAddress(projectId, coin));
        return new RechargeAddressVO(coin.getCurrency(), coin.getNetwork(), coin.getChainName(), address);
    }

    /** 锁内:已有则解密返回，否则向渠道建址并加密入库。返回明文地址。 */
    private String resolveAddress(Long projectId, BilCoin coin) {
        BilAddress existing = addressMapper.selectOne(Wrappers.<BilAddress>lambdaQuery()
                .eq(BilAddress::getProjectId, projectId)
                .eq(BilAddress::getChainId, coin.getChainId())
                .last("limit 1"));
        if (existing != null) {
            return AesGcmUtil.decrypt(properties.addressKey(), existing.getAddressEnc());
        }
        PaymentChannel channel = channelRegistry.get(coin.getChannel());
        String address = channel.createAddress(new PaymentChannel.CreateAddressReq(
                coin.getChainId(), "project:" + projectId, properties.coinly().callbackUrl()));

        BilAddress entity = new BilAddress();
        entity.setProjectId(projectId);
        entity.setChannel(coin.getChannel());
        entity.setChainId(coin.getChainId());
        entity.setAddressEnc(AesGcmUtil.encrypt(properties.addressKey(), address));
        entity.setAddressHash(DigestUtil.sha256Hex(address)); // 回调按 hash 反查项目，不存明文索引
        entity.setTokenId(coin.getTokenId());
        entity.setCurrency(coin.getCurrency());
        addressMapper.insert(entity);
        log.info("项目收款地址已创建, projectId={}, chainId={}, addressHash={}",
                projectId, coin.getChainId(), entity.getAddressHash());
        return address;
    }
}
