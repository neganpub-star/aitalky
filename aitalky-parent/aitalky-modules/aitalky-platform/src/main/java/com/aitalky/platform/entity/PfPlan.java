package com.aitalky.platform.entity;

import com.aitalky.framework.mybatis.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;

/**
 * 套餐(平台定义)。配额拆到 {@link PfPlanQuota}(套餐×资源类型),扩展资源只加行不改表。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("pf_plan")
public class PfPlan extends BaseEntity {

    /** 套餐编码(唯一) */
    private String code;

    /** 套餐名称 */
    private String name;

    /** 档位排序(越大越高) */
    private Integer level;

    /** 每月价格(金额一律 BigDecimal) */
    private BigDecimal monthlyPrice;

    /** 计价币种 */
    private String currency;

    /** 起订月数 */
    private Integer minMonths;

    /** 是否定制版(私有化,费用另议) 1是 */
    private Integer isCustom;

    /** 功能项 JSON 数组文本,如 ["inbox","messenger","translate"] */
    private String features;

    /** 状态 1上架 0下架 */
    private Integer status;
}
