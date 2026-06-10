package com.aitalky.messenger.entity;

import com.aitalky.framework.mybatis.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/** 信使启用语种(每项目多条;type 1默认 0其他)。project_id 多租户自动注入。对齐参考系统 getAppLanguage。 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("mse_messenger_language")
public class MseMessengerLanguage extends BaseEntity {

    private Long projectId;
    private String language;
    /** 1默认 0其他 */
    private Integer type;
    private Integer sort;
}
