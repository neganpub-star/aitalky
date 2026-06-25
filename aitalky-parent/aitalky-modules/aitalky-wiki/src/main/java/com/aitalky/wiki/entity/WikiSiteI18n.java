package com.aitalky.wiki.entity;

import com.aitalky.framework.mybatis.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/** wiki 站点多语言文案(应用名称/首页标题/描述,按语言一行)。 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("wiki_site_i18n")
public class WikiSiteI18n extends BaseEntity {

    private Long projectId;

    private Long siteId;

    /** 语言 */
    private String lang;

    /** 应用名称(分语言) */
    private String appName;

    /** 站点首页标题(宣传文案) */
    private String title;

    /** 自定义描述文字 */
    private String description;
}
