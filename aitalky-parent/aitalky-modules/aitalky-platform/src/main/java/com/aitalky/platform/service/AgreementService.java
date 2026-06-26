package com.aitalky.platform.service;

import com.aitalky.platform.dto.AgreementVO;
import com.aitalky.platform.dto.SaveAgreementCmd;

import java.util.List;

/**
 * 协议管理(平台后管):三件套 × 多语言 的列表/新增编辑/删除。
 */
public interface AgreementService {

    /** 全部协议(按 type、language 排序) */
    List<AgreementVO> list();

    /** 新增/编辑(id 为空=新增,按 type+language 唯一);返回id */
    Long save(SaveAgreementCmd cmd);

    void delete(Long id);

    /** 对外取已发布协议(status=1)按 type+language;缺该语言回退默认语言 zh_CN;无则返回 null */
    AgreementVO getPublished(String type, String language);
}
