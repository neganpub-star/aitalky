package com.aitalky.platform.entity;

import com.aitalky.framework.mybatis.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 平台语种字典(候选全集)。后管维护;租户在「信使启用语种」(mse_messenger_language)里从本表候选项中勾选。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("pf_language")
public class PfLanguage extends BaseEntity {

    /** 语言编码 zh_CN/en_US...(唯一) */
    private String code;

    /** 中文名 */
    private String zhName;

    /** 英文名 */
    private String enName;

    /** 排序(小在前) */
    private Integer sort;

    /** 状态 1启用 0停用 */
    private Integer status;
}
