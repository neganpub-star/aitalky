package com.aitalky.platform.service;

import com.aitalky.platform.dto.LanguageVO;
import com.aitalky.platform.dto.SaveLanguageCmd;

import java.util.List;

/**
 * 语种字典服务(平台候选全集)。
 * <p>{@link #listEnabled()} 供租户端(console)读取候选项;其余为后管维护。
 */
public interface LanguageService {

    /** 全部语种(按 sort 升序),后管列表用 */
    List<LanguageVO> listAll();

    /** 启用中的语种(按 sort 升序),租户端候选项用 */
    List<LanguageVO> listEnabled();

    /** 新增/编辑(id 为空=新增,按 code 唯一);返回id */
    Long save(SaveLanguageCmd cmd);

    /** 启用/停用(status 1启用 0停用) */
    void updateStatus(Long id, Integer status);

    void delete(Long id);
}
