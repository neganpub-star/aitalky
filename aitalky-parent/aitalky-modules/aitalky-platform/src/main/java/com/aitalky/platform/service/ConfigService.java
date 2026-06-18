package com.aitalky.platform.service;

import com.aitalky.platform.dto.ConfigVO;

import java.util.List;

/**
 * 平台参数配置:后管参数管理 + 业务读取(订单超时/客服链接等)。
 */
public interface ConfigService {

    /** 全部参数(后管管理列表,按 sort 升序) */
    List<ConfigVO> list();

    /** 取配置值(无则返回 defaultValue) */
    String getValue(String key, String defaultValue);

    /** 取整型配置(无/非法返回 defaultValue) */
    int getInt(String key, int defaultValue);

    /** 更新配置值(按 id) */
    void updateValue(Long id, String value);
}
