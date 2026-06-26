package com.aitalky.platform.service;

import com.aitalky.platform.dto.ConfigSaveCmd;
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

    /** 新增参数(configKey 全局唯一);返回新 id */
    Long create(ConfigSaveCmd cmd);

    /** 编辑参数(全字段:键/值/名称/说明) */
    void update(Long id, ConfigSaveCmd cmd);

    /** 删除参数(自定义参数;内置键删除后业务读取走默认值) */
    void delete(Long id);
}
