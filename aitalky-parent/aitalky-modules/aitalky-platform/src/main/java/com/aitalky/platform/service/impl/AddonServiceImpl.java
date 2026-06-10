package com.aitalky.platform.service.impl;

import com.aitalky.common.api.ResultCode;
import com.aitalky.common.exception.BizException;
import com.aitalky.common.id.SnowflakeIdGenerator;
import com.aitalky.platform.dto.AddonVO;
import com.aitalky.platform.dto.SaveAddonCmd;
import com.aitalky.platform.entity.PfAddonPack;
import com.aitalky.platform.mapper.PfAddonPackMapper;
import com.aitalky.platform.service.AddonService;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 加量包管理实现。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AddonServiceImpl implements AddonService {

    private final PfAddonPackMapper addonMapper;
    private final SnowflakeIdGenerator idGenerator;

    @Override
    public List<AddonVO> list() {
        return addonMapper.selectList(Wrappers.<PfAddonPack>lambdaQuery().orderByDesc(PfAddonPack::getCreateTime))
                .stream().map(this::toVO).toList();
    }

    @Override
    public Long save(SaveAddonCmd cmd) {
        Long exist = addonMapper.selectCount(Wrappers.<PfAddonPack>lambdaQuery()
                .eq(PfAddonPack::getCode, cmd.code())
                .ne(cmd.id() != null, PfAddonPack::getId, cmd.id()));
        if (exist != null && exist > 0) {
            throw new BizException(ResultCode.DATA_DUPLICATED);
        }
        PfAddonPack addon = new PfAddonPack();
        addon.setCode(cmd.code());
        addon.setName(cmd.name());
        addon.setResourceType(cmd.resourceType());
        addon.setSpecAmount(cmd.specAmount());
        addon.setPrice(cmd.price());
        addon.setCurrency(cmd.currency() == null ? "USD" : cmd.currency());
        addon.setStatus(cmd.status() == null ? 1 : cmd.status());
        if (cmd.id() == null) {
            addon.setId(idGenerator.nextId());
            addonMapper.insert(addon);
        } else {
            addon.setId(cmd.id());
            addonMapper.updateById(addon);
        }
        log.info("加量包保存 id={}, code={}", addon.getId(), cmd.code());
        return addon.getId();
    }

    @Override
    public void updateStatus(Long id, Integer status) {
        PfAddonPack addon = addonMapper.selectById(id);
        if (addon == null) {
            throw new BizException(ResultCode.NOT_FOUND);
        }
        PfAddonPack update = new PfAddonPack();
        update.setId(id);
        update.setStatus(status);
        addonMapper.updateById(update);
    }

    @Override
    public void delete(Long id) {
        addonMapper.deleteById(id);
    }

    private AddonVO toVO(PfAddonPack a) {
        return new AddonVO(a.getId(), a.getCode(), a.getName(), a.getResourceType(),
                a.getSpecAmount(), a.getPrice(), a.getCurrency(), a.getStatus());
    }
}
