package com.aitalky.platform.service.impl;

import com.aitalky.common.api.ResultCode;
import com.aitalky.common.exception.BizException;
import com.aitalky.common.id.SnowflakeIdGenerator;
import com.aitalky.platform.dto.LanguageVO;
import com.aitalky.platform.dto.SaveLanguageCmd;
import com.aitalky.platform.entity.PfLanguage;
import com.aitalky.platform.mapper.PfLanguageMapper;
import com.aitalky.platform.service.LanguageService;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 语种字典服务实现。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LanguageServiceImpl implements LanguageService {

    private final PfLanguageMapper languageMapper;
    private final SnowflakeIdGenerator idGenerator;

    @Override
    public List<LanguageVO> listAll() {
        return languageMapper.selectList(Wrappers.<PfLanguage>lambdaQuery()
                        .orderByAsc(PfLanguage::getSort))
                .stream().map(this::toVO).toList();
    }

    @Override
    public List<LanguageVO> listEnabled() {
        return languageMapper.selectList(Wrappers.<PfLanguage>lambdaQuery()
                        .eq(PfLanguage::getStatus, 1)
                        .orderByAsc(PfLanguage::getSort))
                .stream().map(this::toVO).toList();
    }

    @Override
    public Long save(SaveLanguageCmd cmd) {
        Long exist = languageMapper.selectCount(Wrappers.<PfLanguage>lambdaQuery()
                .eq(PfLanguage::getCode, cmd.code())
                .ne(cmd.id() != null, PfLanguage::getId, cmd.id()));
        if (exist != null && exist > 0) {
            throw new BizException(ResultCode.DATA_DUPLICATED);
        }
        PfLanguage lang = new PfLanguage();
        lang.setCode(cmd.code());
        lang.setZhName(cmd.zhName());
        lang.setEnName(cmd.enName());
        lang.setSort(cmd.sort() == null ? 0 : cmd.sort());
        lang.setStatus(cmd.status() == null ? 1 : cmd.status());
        if (cmd.id() == null) {
            lang.setId(idGenerator.nextId());
            languageMapper.insert(lang);
        } else {
            lang.setId(cmd.id());
            languageMapper.updateById(lang);
        }
        log.info("语种保存 id={}, code={}", lang.getId(), cmd.code());
        return lang.getId();
    }

    @Override
    public void updateStatus(Long id, Integer status) {
        PfLanguage lang = languageMapper.selectById(id);
        if (lang == null) {
            throw new BizException(ResultCode.NOT_FOUND);
        }
        PfLanguage update = new PfLanguage();
        update.setId(id);
        update.setStatus(status);
        languageMapper.updateById(update);
    }

    @Override
    public void delete(Long id) {
        languageMapper.deleteById(id);
    }

    private LanguageVO toVO(PfLanguage l) {
        return new LanguageVO(l.getId(), l.getCode(), l.getZhName(), l.getEnName(), l.getSort(), l.getStatus());
    }
}
