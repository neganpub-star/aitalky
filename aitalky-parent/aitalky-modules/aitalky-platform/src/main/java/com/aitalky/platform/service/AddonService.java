package com.aitalky.platform.service;

import com.aitalky.platform.dto.AddonVO;
import com.aitalky.platform.dto.SaveAddonCmd;

import java.util.List;

/**
 * 加量包管理(平台后管):列表/新增编辑/上下架/删除。
 */
public interface AddonService {

    List<AddonVO> list();

    /** 新增/编辑(id 为空=新增);返回id */
    Long save(SaveAddonCmd cmd);

    /** 上架/下架(status 1上架 0下架) */
    void updateStatus(Long id, Integer status);

    void delete(Long id);
}
