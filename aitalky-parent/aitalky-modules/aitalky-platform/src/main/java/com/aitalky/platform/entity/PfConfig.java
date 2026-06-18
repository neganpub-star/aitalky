package com.aitalky.platform.entity;

import com.aitalky.framework.mybatis.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 平台参数配置(后管「参数管理」)。key-value,后管可改。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("pf_config")
public class PfConfig extends BaseEntity {

    /** 配置键(唯一) */
    private String configKey;
    /** 配置值 */
    private String configValue;
    /** 显示名称 */
    private String name;
    /** 说明 */
    private String remark;
    /** 分组 */
    private String configGroup;
    private Integer sort;
    /** 1启用 0停用 */
    private Integer status;
}
