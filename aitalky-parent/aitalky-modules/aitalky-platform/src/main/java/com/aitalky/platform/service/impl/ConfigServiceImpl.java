package com.aitalky.platform.service.impl;

import com.aitalky.common.api.ResultCode;
import com.aitalky.common.exception.BizException;
import com.aitalky.platform.dto.ConfigSaveCmd;
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
    public Long create(ConfigSaveCmd cmd) {
        String key = cmd.configKey() == null ? "" : cmd.configKey().trim();
        if (key.isEmpty()) {
            throw new BizException(ResultCode.PARAM_INVALID);
        }
        if (existsKey(key, null)) {
            throw new BizException(ResultCode.DATA_DUPLICATED);
        }
        PfConfig c = new PfConfig();
        c.setConfigKey(key);
        c.setConfigValue(cmd.configValue());
        c.setName(cmd.name());
        c.setRemark(cmd.remark());
        c.setConfigGroup("custom"); // 后管新增统一归入 custom 分组
        c.setSort(0);
        c.setStatus(1);
        configMapper.insert(c); // id 由 BaseEntity insertFill 注入雪花
        log.info("平台参数新增 id={}, key={}", c.getId(), key);
        return c.getId();
    }

    @Override
    public void update(Long id, ConfigSaveCmd cmd) {
        PfConfig c = configMapper.selectById(id);
        if (c == null) {
            throw new BizException(ResultCode.NOT_FOUND);
        }
        String key = cmd.configKey() == null ? "" : cmd.configKey().trim();
        if (key.isEmpty()) {
            throw new BizException(ResultCode.PARAM_INVALID);
        }
        if (existsKey(key, id)) {
            throw new BizException(ResultCode.DATA_DUPLICATED);
        }
        PfConfig update = new PfConfig();
        update.setId(id);
        update.setConfigKey(key);
        update.setConfigValue(cmd.configValue());
        update.setName(cmd.name());
        update.setRemark(cmd.remark());
        configMapper.updateById(update);
        log.info("平台参数编辑 id={}, key={}", id, key);
    }

    @Override
    public void delete(Long id) {
        if (configMapper.selectById(id) == null) {
            throw new BizException(ResultCode.NOT_FOUND);
        }
        configMapper.deleteById(id);
        log.info("平台参数删除 id={}", id);
    }

    /** configKey 是否已存在(excludeId 用于编辑时排除自身) */
    private boolean existsKey(String key, Long excludeId) {
        Long cnt = configMapper.selectCount(Wrappers.<PfConfig>lambdaQuery()
                .eq(PfConfig::getConfigKey, key)
                .ne(excludeId != null, PfConfig::getId, excludeId));
        return cnt != null && cnt > 0;
    }

    private ConfigVO toVO(PfConfig c) {
        return new ConfigVO(c.getId(), c.getConfigKey(), c.getConfigValue(), c.getName(),
                c.getRemark(), c.getConfigGroup(), c.getStatus());
    }
}
