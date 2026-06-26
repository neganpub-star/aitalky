package com.aitalky.wiki.service.impl;

import com.aitalky.common.api.ResultCode;
import com.aitalky.common.exception.BizException;
import com.aitalky.common.id.SnowflakeIdGenerator;
import com.aitalky.wiki.dto.SiteReq;
import com.aitalky.wiki.dto.WikiSiteDetailVO;
import com.aitalky.wiki.dto.WikiSiteVO;
import com.aitalky.wiki.entity.WikiSite;
import com.aitalky.wiki.entity.WikiSiteI18n;
import com.aitalky.wiki.mapper.WikiSiteI18nMapper;
import com.aitalky.wiki.mapper.WikiSiteMapper;
import com.aitalky.wiki.service.WikiSiteService;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.security.SecureRandom;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * wiki 站点管理实现。project_id 由多租户拦截器自动注入/过滤。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class WikiSiteServiceImpl implements WikiSiteService {

    private static final String DEFAULT_LANG = "zh_CN";
    private static final char[] BASE62 = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ".toCharArray();
    private static final SecureRandom RND = new SecureRandom();

    private final WikiSiteMapper siteMapper;
    private final WikiSiteI18nMapper i18nMapper;
    private final SnowflakeIdGenerator idGenerator;

    @Override
    public List<WikiSiteVO> listSites() {
        ensureDefaultSite();
        List<WikiSite> sites = siteMapper.selectList(Wrappers.<WikiSite>lambdaQuery()
                .orderByDesc(WikiSite::getIsDefault) // 默认应用置顶
                .orderByAsc(WikiSite::getSort).orderByAsc(WikiSite::getId));
        if (sites.isEmpty()) {
            return List.of();
        }
        // 批量取各站点默认语言文案,映射列表名称/描述
        List<Long> siteIds = sites.stream().map(WikiSite::getId).toList();
        Map<String, WikiSiteI18n> i18nByKey = i18nMapper.selectList(Wrappers.<WikiSiteI18n>lambdaQuery()
                        .in(WikiSiteI18n::getSiteId, siteIds))
                .stream().collect(Collectors.toMap(x -> x.getSiteId() + "#" + x.getLang(), Function.identity(), (a, b) -> a));
        return sites.stream().map(s -> {
            WikiSiteI18n i18n = i18nByKey.get(s.getId() + "#" + s.getDefaultLang());
            return new WikiSiteVO(s.getId(), s.getShareCode(), s.getIcon(),
                    i18n == null ? null : i18n.getAppName(),
                    i18n == null ? null : i18n.getDescription(),
                    s.getDefaultLang(), s.getMultiLang(), s.getSubdomain(), s.getEnabled(), s.getIsDefault());
        }).toList();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Long createCustomSite(SiteReq.Create req) {
        String lang = StringUtils.hasText(req.defaultLang()) ? req.defaultLang() : DEFAULT_LANG;
        if (StringUtils.hasText(req.subdomain()) && !subdomainAvailable(req.subdomain(), null)) {
            throw new BizException(ResultCode.DATA_DUPLICATED);
        }
        WikiSite s = new WikiSite();
        s.setId(idGenerator.nextId());
        s.setShareCode(randomShareCode());
        s.setIcon(req.icon());
        s.setDefaultLang(lang);
        s.setMultiLang(0);
        s.setLayout(1);
        s.setEnabled(0); // 新建默认禁用,需手动开启
        s.setIsDefault(0);
        s.setSort(0);
        s.setSubdomain(StringUtils.hasText(req.subdomain()) ? req.subdomain() : null);
        siteMapper.insert(s);
        upsertI18n(s.getId(), lang, req.appName(), null, null);
        log.info("创建 wiki 自定义应用 siteId={}, subdomain={}", s.getId(), s.getSubdomain());
        return s.getId();
    }

    @Override
    public WikiSiteDetailVO detail(Long siteId) {
        WikiSite s = getOwned(siteId);
        List<WikiSiteDetailVO.I18n> i18ns = i18nMapper.selectList(Wrappers.<WikiSiteI18n>lambdaQuery()
                        .eq(WikiSiteI18n::getSiteId, siteId))
                .stream().map(x -> new WikiSiteDetailVO.I18n(x.getLang(), x.getAppName(), x.getTitle(), x.getDescription()))
                .toList();
        return new WikiSiteDetailVO(s.getId(), s.getShareCode(), s.getIcon(), s.getLogo(), s.getBrandShort(), s.getDefaultLang(),
                s.getMultiLang(), s.getThemeColor(), s.getLayout(), s.getSubdomain(), s.getCustomDomain(),
                s.getFavicon(), s.getEnabled(), s.getIsDefault(), i18ns);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void saveConfig(Long siteId, SiteReq.SaveConfig req) {
        WikiSite s = getOwned(siteId);
        if (StringUtils.hasText(req.subdomain()) && !subdomainAvailable(req.subdomain(), siteId)) {
            throw new BizException(ResultCode.DATA_DUPLICATED);
        }
        if (req.enabled() != null) {
            s.setEnabled(req.enabled());
        }
        s.setIcon(req.icon());
        if (StringUtils.hasText(req.defaultLang())) {
            s.setDefaultLang(req.defaultLang());
        }
        if (req.multiLang() != null) {
            s.setMultiLang(req.multiLang());
        }
        s.setSubdomain(StringUtils.hasText(req.subdomain()) ? req.subdomain() : null);
        s.setCustomDomain(req.customDomain());
        s.setFavicon(req.favicon());
        siteMapper.updateById(s);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void saveStyle(Long siteId, SiteReq.SaveStyle req) {
        WikiSite s = getOwned(siteId);
        String lang = StringUtils.hasText(req.lang()) ? req.lang() : s.getDefaultLang();
        // 全局:LOGO/产品简称/主题色/布局
        s.setLogo(req.logo());
        s.setBrandShort(req.brandShort());
        s.setThemeColor(req.themeColor());
        if (req.layout() != null) {
            s.setLayout(req.layout());
        }
        siteMapper.updateById(s);
        // 分语言:应用名称/标题/描述
        upsertI18n(siteId, lang, req.appName(), req.title(), req.description());
    }

    @Override
    public void toggleEnabled(Long siteId, Integer enabled) {
        WikiSite s = getOwned(siteId);
        s.setEnabled(enabled == null ? 0 : enabled);
        siteMapper.updateById(s);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteSite(Long siteId) {
        WikiSite s = getOwned(siteId);
        if (Integer.valueOf(1).equals(s.getIsDefault())) {
            throw new BizException(ResultCode.PARAM_INVALID); // 默认应用不可删
        }
        // 类别/分组/关联的级联清理在内容配置(D)模块统一处理;此处删站点本体 + 文案
        siteMapper.deleteById(siteId);
        i18nMapper.delete(Wrappers.<WikiSiteI18n>lambdaQuery().eq(WikiSiteI18n::getSiteId, siteId));
        log.info("删除 wiki 应用 siteId={}", siteId);
    }

    @Override
    public boolean subdomainAvailable(String subdomain, Long excludeSiteId) {
        if (!StringUtils.hasText(subdomain)) {
            return true;
        }
        Long cnt = siteMapper.selectCount(Wrappers.<WikiSite>lambdaQuery()
                .eq(WikiSite::getSubdomain, subdomain)
                .ne(excludeSiteId != null, WikiSite::getId, excludeSiteId));
        return cnt == null || cnt == 0;
    }

    /** 项目无默认应用时初始化"帮助中心"(禁用态)。 */
    private void ensureDefaultSite() {
        Long cnt = siteMapper.selectCount(Wrappers.<WikiSite>lambdaQuery().eq(WikiSite::getIsDefault, 1));
        if (cnt != null && cnt > 0) {
            return;
        }
        WikiSite s = new WikiSite();
        s.setId(idGenerator.nextId());
        s.setShareCode(randomShareCode());
        s.setDefaultLang(DEFAULT_LANG);
        s.setMultiLang(0);
        s.setLayout(1);
        s.setEnabled(0);
        s.setIsDefault(1);
        s.setSort(0);
        siteMapper.insert(s);
        upsertI18n(s.getId(), DEFAULT_LANG, "帮助中心", "您好,有什么可以帮您?", "搜索或浏览下方常见问题");
        log.info("初始化默认 wiki 应用(帮助中心) siteId={}", s.getId());
    }

    /** upsert 站点某语言文案。 */
    private void upsertI18n(Long siteId, String lang, String appName, String title, String description) {
        WikiSiteI18n exist = i18nMapper.selectOne(Wrappers.<WikiSiteI18n>lambdaQuery()
                .eq(WikiSiteI18n::getSiteId, siteId).eq(WikiSiteI18n::getLang, lang).last("limit 1"));
        if (exist == null) {
            WikiSiteI18n i18n = new WikiSiteI18n();
            i18n.setId(idGenerator.nextId());
            i18n.setSiteId(siteId);
            i18n.setLang(lang);
            i18n.setAppName(appName);
            i18n.setTitle(title);
            i18n.setDescription(description);
            i18nMapper.insert(i18n);
        } else {
            exist.setAppName(appName);
            exist.setTitle(title);
            exist.setDescription(description);
            i18nMapper.updateById(exist);
        }
    }

    /** 取站点并校验归属(多租户拦截器已按 project_id 过滤,查不到即越权或不存在)。 */
    private WikiSite getOwned(Long siteId) {
        WikiSite s = siteMapper.selectById(siteId);
        if (s == null) {
            throw new BizException(ResultCode.NOT_FOUND);
        }
        return s;
    }

    /** 生成站点对外公开标识(base62, 10位);对外站点路由/预览/分享用。 */
    private String randomShareCode() {
        StringBuilder sb = new StringBuilder(10);
        for (int i = 0; i < 10; i++) {
            sb.append(BASE62[RND.nextInt(BASE62.length)]);
        }
        return sb.toString();
    }
}
