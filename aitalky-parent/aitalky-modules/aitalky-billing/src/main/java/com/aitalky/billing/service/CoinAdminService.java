package com.aitalky.billing.service;

import com.aitalky.billing.service.dto.CoinAdminVO;
import com.aitalky.billing.service.dto.SaveCoinCmd;

import java.util.List;

/** 币种配置管理(平台后管):列表/新增编辑/上下架/删除。bil_coin 数据驱动充值。 */
public interface CoinAdminService {

    /** 全部币种(含停用,按 sort 升序) */
    List<CoinAdminVO> list();

    /** 新增/编辑(id 为空=新增);currency 在渠道内唯一。返回id */
    Long save(SaveCoinCmd cmd);

    /** 启用/停用(status 1启用 0停用) */
    void updateStatus(Long id, Integer status);

    /** 删除(逻辑删除) */
    void delete(Long id);
}
