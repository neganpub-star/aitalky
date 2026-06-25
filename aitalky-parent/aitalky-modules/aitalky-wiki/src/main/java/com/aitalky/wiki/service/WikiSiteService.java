package com.aitalky.wiki.service;

import com.aitalky.wiki.dto.SiteReq;
import com.aitalky.wiki.dto.WikiSiteDetailVO;
import com.aitalky.wiki.dto.WikiSiteVO;

import java.util.List;

/**
 * wiki 站点(应用)管理。多租户:project_id 由拦截器自动注入/过滤。
 */
public interface WikiSiteService {

    /** 应用列表(首次访问惰性初始化默认应用"帮助中心")。 */
    List<WikiSiteVO> listSites();

    /** 创建自定义应用,返回站点id。新建默认禁用。 */
    Long createCustomSite(SiteReq.Create req);

    /** 站点详情(编辑页)。 */
    WikiSiteDetailVO detail(Long siteId);

    /** 保存站点配置(状态/图标/默认语言/多语言/子域/自定义域名/favicon)。 */
    void saveConfig(Long siteId, SiteReq.SaveConfig req);

    /** 保存样式配置(按语言:LOGO/产品简称/应用名称/标题/描述/主题色/布局)。 */
    void saveStyle(Long siteId, SiteReq.SaveStyle req);

    /** 开启/禁用站点。 */
    void toggleEnabled(Long siteId, Integer enabled);

    /** 删除应用(默认应用不可删)。 */
    void deleteSite(Long siteId);

    /** 子域在项目内是否可用(excludeSiteId 为编辑时排除自身)。 */
    boolean subdomainAvailable(String subdomain, Long excludeSiteId);
}
