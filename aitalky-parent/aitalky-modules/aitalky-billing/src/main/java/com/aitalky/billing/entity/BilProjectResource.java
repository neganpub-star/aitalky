package com.aitalky.billing.entity;

import com.aitalky.framework.mybatis.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 项目级永久加量包配额:已购的 customer/translate_char/ai_tokens 累计配额。
 * <p>永久有效、脱离订阅(订阅到期不清零);每项目每资源类型一条(uk project_id+resource_type)。
 * <p>套餐型资源(seat/article/site)不在此表,走订阅+套餐配额实时计算。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("bil_project_resource")
public class BilProjectResource extends BaseEntity {

    private Long projectId;
    /** 资源类型 customer / translate_char / ai_tokens */
    private String resourceType;
    /** 已购加量包配额累计(永久,不随订阅到期) */
    private Long purchasedAmount;
}
