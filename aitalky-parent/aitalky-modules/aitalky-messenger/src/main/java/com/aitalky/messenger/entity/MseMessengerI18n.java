package com.aitalky.messenger.entity;

import com.aitalky.framework.mybatis.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/** 信使多语言内容(问候语/团队介绍/紧急通知,按语言;uk_project_lang)。project_id 多租户自动注入。 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("mse_messenger_i18n")
public class MseMessengerI18n extends BaseEntity {

    private Long projectId;
    private String language;
    private String greeting;
    private String teamIntro;
    private String urgentNotice;
    private Boolean urgentEnabled;
}
