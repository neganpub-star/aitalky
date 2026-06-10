package com.aitalky.messenger.entity;

import com.aitalky.framework.mybatis.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 信使配置(每项目一条,uk_project)。project_id 多租户自动注入。
 * <p>enabled_languages / launcher_config 为 JSON 列,实体按原始字符串存取,由 Service 与 VO 互转。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("mse_messenger")
public class MseMessenger extends BaseEntity {

    private Long projectId;
    private String brandName;
    private String logo;
    private String customDomain;
    private String badge;
    private String webTitle;
    private String webIcon;
    /** 启动器/角标样式 JSON(本轮未编辑,透传保留) */
    private String launcherConfig;
    private String defaultLanguage;
    /** 启用语种 JSON 数组,如 ["zh_CN","en_US"] */
    private String enabledLanguages;
    private String replyTime;
    private Integer messageRetentionDays;
    private Boolean popupEnabled;
    private Boolean popupAllowClose;
}
