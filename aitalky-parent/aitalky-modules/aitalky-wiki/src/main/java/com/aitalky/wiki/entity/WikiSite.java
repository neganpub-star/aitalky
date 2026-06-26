package com.aitalky.wiki.entity;

import com.aitalky.framework.mybatis.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * wiki 站点(应用)。默认应用"帮助中心"(is_default=1)不可删;自定义应用可删。
 * <p>LOGO/产品简称/主题色/布局等为站点全局;应用名称/标题/描述按语言存 {@link WikiSiteI18n}。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("wiki_site")
public class WikiSite extends BaseEntity {

    /** 项目id */
    private Long projectId;

    /** 站点对外公开标识(base62);对外站点首页/分类页公开访问、预览/分享均以此定位 */
    private String shareCode;

    /** 应用图标(图标库key) */
    private String icon;

    /** 应用LOGO(全局) */
    private String logo;

    /** 产品简称(全局) */
    private String brandShort;

    /** 默认语言 */
    private String defaultLang;

    /** 是否多语言 0单语 1多语 */
    private Integer multiLang;

    /** 主题色(hex) */
    private String themeColor;

    /** 类别页布局 1列表模式 2双栏模式 */
    private Integer layout;

    /** 子域(项目内唯一,对外站点用) */
    private String subdomain;

    /** 自定义域名(对外站点用) */
    private String customDomain;

    /** 站点 favicon */
    private String favicon;

    /** 站点状态 0已禁用 1已开启 */
    private Integer enabled;

    /** 是否默认应用 0自定义(可删) 1默认帮助中心(不可删) */
    private Integer isDefault;

    /** 排序值 */
    private Integer sort;
}
