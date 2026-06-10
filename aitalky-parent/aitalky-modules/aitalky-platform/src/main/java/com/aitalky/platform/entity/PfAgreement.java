package com.aitalky.platform.entity;

import com.aitalky.framework.mybatis.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 平台协议/法律文档(后管编辑,多语言)。
 * <p>三件套:terms 服务条款 / privacy 隐私政策 / subscription 套餐订阅协议;按 (type,language) 唯一。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("pf_agreement")
public class PfAgreement extends BaseEntity {

    /** 类型 terms/privacy/subscription */
    private String type;

    /** 语言 zh_CN/en_US... */
    private String language;

    /** 标题 */
    private String title;

    /** 正文(富文本) */
    private String content;

    /** 版本 */
    private String version;

    /** 状态 1发布 0草稿 */
    private Integer status;
}
