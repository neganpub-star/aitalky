package com.aitalky.platform.service.impl;

import com.aitalky.common.api.ResultCode;
import com.aitalky.common.exception.BizException;
import com.aitalky.platform.dto.ConfigVO;
import com.aitalky.platform.entity.PfConfig;
import com.aitalky.platform.mapper.PfConfigMapper;
import com.aitalky.platform.service.ConfigService;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 平台参数配置实现。读取走主键/键查询(量小,不加缓存;高频可后续加本地缓存)。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ConfigServiceImpl implements ConfigService {

    private final PfConfigMapper configMapper;

    @Override
    public List<ConfigVO> list() {
        return configMapper.selectList(Wrappers.<PfConfig>lambdaQuery().orderByAsc(PfConfig::getSort))
                .stream().map(this::toVO).toList();
    }

    @Override
    public String getValue(String key, String defaultValue) {
        PfConfig c = configMapper.selectOne(Wrappers.<PfConfig>lambdaQuery()
                .eq(PfConfig::getConfigKey, key).last("limit 1"));
        if (c == null || c.getConfigValue() == null || c.getConfigValue().isBlank()) {
            return defaultValue;
        }
        return c.getConfigValue();
    }

    @Override
    public int getInt(String key, int defaultValue) {
        try {
            return Integer.parseInt(getValue(key, String.valueOf(defaultValue)).trim());
        } catch (NumberFormatException e) {
            return defaultValue;
        }
    }

    @Override
    public void updateValue(Long id, String value) {
        PfConfig c = configMapper.selectById(id);
        if (c == null) {
            throw new BizException(ResultCode.NOT_FOUND);
        }
        PfConfig update = new PfConfig();
        update.setId(id);
        update.setConfigValue(value);
        configMapper.updateById(update);
        log.info("平台参数更新 id={}, key={}", id, c.getConfigKey());
    }

    private ConfigVO toVO(PfConfig c) {
        return new ConfigVO(c.getId(), c.getConfigKey(), c.getConfigValue(), c.getName(),
                c.getRemark(), c.getConfigGroup(), c.getStatus());
    }
}
