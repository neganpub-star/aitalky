package com.aitalky.platform.service.impl;

import com.aitalky.common.api.ResultCode;
import com.aitalky.common.exception.BizException;
import com.aitalky.common.id.SnowflakeIdGenerator;
import com.aitalky.platform.dto.AgreementVO;
import com.aitalky.platform.dto.SaveAgreementCmd;
import com.aitalky.platform.entity.PfAgreement;
import com.aitalky.platform.mapper.PfAgreementMapper;
import com.aitalky.platform.service.AgreementService;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 协议管理实现。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AgreementServiceImpl implements AgreementService {

    private final PfAgreementMapper agreementMapper;
    private final SnowflakeIdGenerator idGenerator;

    @Override
    public List<AgreementVO> list() {
        return agreementMapper.selectList(Wrappers.<PfAgreement>lambdaQuery()
                        .orderByAsc(PfAgreement::getType).orderByAsc(PfAgreement::getLanguage))
                .stream().map(this::toVO).toList();
    }

    @Override
    public Long save(SaveAgreementCmd cmd) {
        // 同一 type+language 唯一(排除自身)
        Long exist = agreementMapper.selectCount(Wrappers.<PfAgreement>lambdaQuery()
                .eq(PfAgreement::getType, cmd.type())
                .eq(PfAgreement::getLanguage, cmd.language())
                .ne(cmd.id() != null, PfAgreement::getId, cmd.id()));
        if (exist != null && exist > 0) {
            throw new BizException(ResultCode.DATA_DUPLICATED);
        }
        PfAgreement agreement = new PfAgreement();
        agreement.setType(cmd.type());
        agreement.setLanguage(cmd.language());
        agreement.setTitle(cmd.title());
        agreement.setContent(cmd.content());
        agreement.setVersion(cmd.version());
        agreement.setStatus(cmd.status() == null ? 1 : cmd.status());
        if (cmd.id() == null) {
            agreement.setId(idGenerator.nextId());
            agreementMapper.insert(agreement);
        } else {
            agreement.setId(cmd.id());
            agreementMapper.updateById(agreement);
        }
        log.info("协议保存 id={}, type={}, lang={}", agreement.getId(), cmd.type(), cmd.language());
        return agreement.getId();
    }

    @Override
    public void delete(Long id) {
        agreementMapper.deleteById(id);
    }

    private AgreementVO toVO(PfAgreement a) {
        return new AgreementVO(a.getId(), a.getType(), a.getLanguage(), a.getTitle(),
                a.getContent(), a.getVersion(), a.getStatus());
    }
}
