package com.aitalky.platform.entity;

import com.aitalky.framework.mybatis.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;

/**
 * 加量包定义(平台)。V1 仅 翻译包 / 席位包。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("pf_addon_pack")
public class PfAddonPack extends BaseEntity {

    /** 加量包编码(唯一) */
    private String code;

    /** 名称 */
    private String name;

    /** 资源类型 translate_char/seat */
    private String resourceType;

    /** 规格数量(如 100万字符 / 1 个席位) */
    private Long specAmount;

    /** 价格(金额一律 BigDecimal) */
    private BigDecimal price;

    /** 币种 */
    private String currency;

    /** 状态 1上架 0下架 */
    private Integer status;
}
