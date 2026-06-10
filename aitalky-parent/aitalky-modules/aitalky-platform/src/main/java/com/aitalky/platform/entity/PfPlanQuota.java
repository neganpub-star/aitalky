package com.aitalky.platform.entity;

import com.aitalky.framework.mybatis.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 套餐含的资源配额(套餐×资源类型)。
 * <p>资源类型:seat 席位 / translate_char 翻译字符 / customer 客户配额;扩展资源只加行。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("pf_plan_quota")
public class PfPlanQuota extends BaseEntity {

    /** 套餐id */
    private Long planId;

    /** 资源类型 seat/translate_char/customer */
    private String resourceType;

    /** 配额数量 */
    private Long amount;

    /** 是否无限制 1是 */
    private Integer isUnlimited;
}
