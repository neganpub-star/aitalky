package com.aitalky.billing.service.impl;

import com.aitalky.billing.entity.BilCoin;
import com.aitalky.billing.mapper.BilCoinMapper;
import com.aitalky.billing.service.CoinAdminService;
import com.aitalky.billing.service.dto.CoinAdminVO;
import com.aitalky.billing.service.dto.SaveCoinCmd;
import com.aitalky.common.api.ResultCode;
import com.aitalky.common.exception.BizException;
import com.aitalky.common.id.SnowflakeIdGenerator;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 币种配置管理实现(后管)。bil_coin 无 project_id,平台级表;后管无租户上下文,拦截器整体忽略。
 * <p>currency 在渠道内唯一(uk channel+currency),保存前校验防撞唯一键。
 */
@Service
@RequiredArgsConstructor
public class CoinAdminServiceImpl implements CoinAdminService {

    private final BilCoinMapper coinMapper;
    private final SnowflakeIdGenerator idGenerator;

    @Override
    public List<CoinAdminVO> list() {
        return coinMapper.selectList(Wrappers.<BilCoin>lambdaQuery()
                        .orderByAsc(BilCoin::getSort)).stream()
                .map(this::toVO).toList();
    }

    @Override
    public Long save(SaveCoinCmd cmd) {
        String channel = cmd.channel() == null || cmd.channel().isBlank() ? "coinly" : cmd.channel();
        // currency 渠道内唯一(排除自身)
        Long dup = coinMapper.selectCount(Wrappers.<BilCoin>lambdaQuery()
                .eq(BilCoin::getChannel, channel)
                .eq(BilCoin::getCurrency, cmd.currency())
                .ne(cmd.id() != null, BilCoin::getId, cmd.id()));
        if (dup != null && dup > 0) {
            throw new BizException(ResultCode.DATA_DUPLICATED);
        }
        BilCoin coin = cmd.id() == null ? new BilCoin() : coinMapper.selectById(cmd.id());
        if (coin == null) {
            throw new BizException(ResultCode.NOT_FOUND);
        }
        coin.setChannel(channel);
        coin.setSymbol(cmd.symbol());
        coin.setCurrency(cmd.currency());
        coin.setNetwork(cmd.network());
        coin.setChainId(cmd.chainId());
        coin.setChainName(cmd.chainName());
        coin.setTokenId(cmd.tokenId());
        coin.setDecimals(cmd.decimals() == null ? 6 : cmd.decimals());
        coin.setSort(cmd.sort() == null ? 0 : cmd.sort());
        coin.setStatus(cmd.status() == null ? 1 : cmd.status());
        if (cmd.id() == null) {
            coin.setId(idGenerator.nextId());
            coinMapper.insert(coin);
        } else {
            coinMapper.updateById(coin);
        }
        return coin.getId();
    }

    @Override
    public void updateStatus(Long id, Integer status) {
        BilCoin coin = coinMapper.selectById(id);
        if (coin == null) {
            throw new BizException(ResultCode.NOT_FOUND);
        }
        BilCoin update = new BilCoin();
        update.setId(id);
        update.setStatus(status);
        coinMapper.updateById(update);
    }

    @Override
    public void delete(Long id) {
        coinMapper.deleteById(id);
    }

    private CoinAdminVO toVO(BilCoin c) {
        return new CoinAdminVO(c.getId(), c.getChannel(), c.getSymbol(), c.getCurrency(),
                c.getNetwork(), c.getChainId(), c.getChainName(), c.getTokenId(),
                c.getDecimals(), c.getSort(), c.getStatus());
    }
}
