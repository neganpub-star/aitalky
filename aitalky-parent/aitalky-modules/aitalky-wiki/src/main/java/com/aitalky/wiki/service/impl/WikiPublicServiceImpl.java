package com.aitalky.wiki.service.impl;

import com.aitalky.common.api.ResultCode;
import com.aitalky.common.exception.BizException;
import com.aitalky.wiki.dto.WikiCategoryPublicVO;
import com.aitalky.wiki.dto.WikiSiteHeaderVO;
import com.aitalky.wiki.dto.WikiSitePublicVO;
import com.aitalky.wiki.entity.*;
import com.aitalky.wiki.mapper.*;
import com.aitalky.wiki.service.WikiPublicService;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 对外站点只读装配实现。公开访问(无 TenantContext),站点表无租户过滤,靠全局唯一 shareCode 定位。
 * <p>只取已发布文章(status∈{2已发布,3有变更}),文案按语言取、空回退默认语言。
 */
@Service
@RequiredArgsConstructor
public class WikiPublicServiceImpl implements WikiPublicService {

    private static final String DEFAULT_LANG = "zh_CN";
    /** 首页每个分类展示的文章条数上限 */
    private static final int HOME_TOP_ARTICLES = 6;

    private final WikiSiteMapper siteMapper;
    private final WikiSiteI18nMapper siteI18nMapper;
    private final WikiCategoryMapper categoryMapper;
    private final WikiCategoryI18nMapper categoryI18nMapper;
    private final WikiGroupMapper groupMapper;
    private final WikiGroupI18nMapper groupI18nMapper;
    private final WikiCategoryArticleMapper linkMapper;
    private final WikiArticleMapper articleMapper;
    private final WikiArticleI18nMapper articleI18nMapper;

    @Override
    public WikiSitePublicVO site(String shareCode, String lang) {
        WikiSite site = siteByShareCode(shareCode);
        WikiSiteHeaderVO header = buildHeader(site, lang);
        String showLang = header.lang();

        List<WikiCategory> categories = categoryMapper.selectList(Wrappers.<WikiCategory>lambdaQuery()
                .eq(WikiCategory::getSiteId, site.getId())
                .orderByAsc(WikiCategory::getSort).orderByAsc(WikiCategory::getId));
        if (categories.isEmpty()) {
            return new WikiSitePublicVO(header, List.of());
        }
        List<Long> categoryIds = categories.stream().map(WikiCategory::getId).toList();
        Map<Long, String> catNames = categoryNames(categoryIds, showLang);
        Map<Long, String> catDescs = categoryDescriptions(categoryIds, showLang);

        List<WikiSitePublicVO.Category> catVos = new ArrayList<>();
        for (WikiCategory c : categories) {
            // 该分类下的关联(按排序),过滤出已发布文章
            List<WikiCategoryArticle> links = linkMapper.selectList(Wrappers.<WikiCategoryArticle>lambdaQuery()
                    .eq(WikiCategoryArticle::getCategoryId, c.getId())
                    .orderByAsc(WikiCategoryArticle::getSort).orderByAsc(WikiCategoryArticle::getId));
            List<Long> publishedIds = publishedArticleIds(links.stream().map(WikiCategoryArticle::getArticleId).toList());
            if (publishedIds.isEmpty()) {
                continue; // 无已发布文章的分类不在首页展示
            }
            Map<Long, WikiArticle> artMap = articleMap(publishedIds);
            Map<Long, String> titleMap = publishedTitles(publishedIds, showLang);
            // 保持 link 排序,取前 N 篇
            List<WikiSitePublicVO.Article> top = links.stream()
                    .map(WikiCategoryArticle::getArticleId).distinct()
                    .filter(artMap::containsKey)
                    .limit(HOME_TOP_ARTICLES)
                    .map(aid -> new WikiSitePublicVO.Article(artMap.get(aid).getShareCode(), titleMap.get(aid)))
                    .toList();
            catVos.add(new WikiSitePublicVO.Category(c.getId(), c.getIcon(),
                    catNames.get(c.getId()), catDescs.get(c.getId()), publishedIds.size(), top));
        }
        return new WikiSitePublicVO(header, catVos);
    }

    @Override
    public WikiCategoryPublicVO category(String shareCode, Long categoryId, String lang) {
        WikiSite site = siteByShareCode(shareCode);
        WikiSiteHeaderVO header = buildHeader(site, lang);
        String showLang = header.lang();

        WikiCategory c = categoryMapper.selectById(categoryId);
        if (c == null || !site.getId().equals(c.getSiteId())) {
            throw new BizException(ResultCode.NOT_FOUND);
        }
        String name = categoryNames(List.of(categoryId), showLang).get(categoryId);
        String desc = categoryDescriptions(List.of(categoryId), showLang).get(categoryId);

        List<WikiCategoryArticle> links = linkMapper.selectList(Wrappers.<WikiCategoryArticle>lambdaQuery()
                .eq(WikiCategoryArticle::getCategoryId, categoryId)
                .orderByAsc(WikiCategoryArticle::getSort).orderByAsc(WikiCategoryArticle::getId));
        Set<Long> publishedSet = Set.copyOf(publishedArticleIds(links.stream().map(WikiCategoryArticle::getArticleId).toList()));
        Map<Long, WikiArticle> artMap = articleMap(new ArrayList<>(publishedSet));
        Map<Long, WikiArticleI18n> snapMap = publishedSnapshots(new ArrayList<>(publishedSet), showLang);

        // 直接挂分类(无分组)
        List<WikiCategoryPublicVO.ArticleCard> direct = links.stream()
                .filter(l -> (l.getGroupId() == null || l.getGroupId() == 0) && publishedSet.contains(l.getArticleId()))
                .map(l -> toCard(l.getArticleId(), artMap, snapMap)).toList();

        // 分组(按排序),每组取其已发布文章
        List<WikiGroup> groups = groupMapper.selectList(Wrappers.<WikiGroup>lambdaQuery()
                .eq(WikiGroup::getCategoryId, categoryId)
                .orderByAsc(WikiGroup::getSort).orderByAsc(WikiGroup::getId));
        Map<Long, String> groupNames = groupNames(groups, showLang);
        Map<Long, List<WikiCategoryArticle>> byGroup = links.stream()
                .filter(l -> l.getGroupId() != null && l.getGroupId() != 0 && publishedSet.contains(l.getArticleId()))
                .collect(Collectors.groupingBy(WikiCategoryArticle::getGroupId));
        List<WikiCategoryPublicVO.Group> groupVos = new ArrayList<>();
        for (WikiGroup g : groups) {
            List<WikiCategoryArticle> gl = byGroup.getOrDefault(g.getId(), List.of());
            if (gl.isEmpty()) {
                continue; // 空分组不展示
            }
            groupVos.add(new WikiCategoryPublicVO.Group(groupNames.get(g.getId()),
                    gl.stream().map(l -> toCard(l.getArticleId(), artMap, snapMap)).toList()));
        }
        return new WikiCategoryPublicVO(header, c.getId(), c.getIcon(), name, desc,
                publishedSet.size(), direct, groupVos);
    }

    @Override
    public List<WikiCategoryPublicVO.ArticleCard> search(String shareCode, String keyword, String lang) {
        WikiSite site = siteByShareCode(shareCode);
        String showLang = StringUtils.hasText(lang) ? lang : site.getDefaultLang();
        if (!StringUtils.hasText(keyword)) {
            return List.of();
        }
        // 站点全部分类 → 关联文章 → 已发布
        List<Long> categoryIds = categoryMapper.selectList(Wrappers.<WikiCategory>lambdaQuery()
                        .eq(WikiCategory::getSiteId, site.getId()))
                .stream().map(WikiCategory::getId).toList();
        if (categoryIds.isEmpty()) {
            return List.of();
        }
        List<WikiCategoryArticle> links = linkMapper.selectList(Wrappers.<WikiCategoryArticle>lambdaQuery()
                .in(WikiCategoryArticle::getCategoryId, categoryIds));
        List<Long> publishedIds = publishedArticleIds(links.stream().map(WikiCategoryArticle::getArticleId).toList());
        if (publishedIds.isEmpty()) {
            return List.of();
        }
        Map<Long, WikiArticle> artMap = articleMap(publishedIds);
        Map<Long, WikiArticleI18n> snapMap = publishedSnapshots(publishedIds, showLang);
        String kw = keyword.trim().toLowerCase();
        // 去重(同一文章可能挂多个分类)+ 标题/摘要命中
        return publishedIds.stream().distinct()
                .map(aid -> toCard(aid, artMap, snapMap))
                .filter(card -> (card.title() != null && card.title().toLowerCase().contains(kw))
                        || (card.summary() != null && card.summary().toLowerCase().contains(kw)))
                .toList();
    }

    // ============ 装配辅助 ============

    private WikiSite siteByShareCode(String shareCode) {
        WikiSite site = siteMapper.selectOne(Wrappers.<WikiSite>lambdaQuery()
                .eq(WikiSite::getShareCode, shareCode).last("limit 1"));
        if (site == null) {
            throw new BizException(ResultCode.NOT_FOUND);
        }
        return site;
    }

    private WikiSiteHeaderVO buildHeader(WikiSite site, String lang) {
        String defaultLang = StringUtils.hasText(site.getDefaultLang()) ? site.getDefaultLang() : DEFAULT_LANG;
        List<String> langs = Integer.valueOf(1).equals(site.getMultiLang())
                ? List.of("zh_CN", "en_US") : List.of(defaultLang);
        String showLang = StringUtils.hasText(lang) && langs.contains(lang) ? lang : defaultLang;

        List<WikiSiteI18n> i18ns = siteI18nMapper.selectList(Wrappers.<WikiSiteI18n>lambdaQuery()
                .eq(WikiSiteI18n::getSiteId, site.getId()));
        WikiSiteI18n cur = pick(i18ns, showLang, defaultLang, WikiSiteI18n::getLang);
        return new WikiSiteHeaderVO(site.getShareCode(), site.getLogo(), site.getBrandShort(), site.getThemeColor(),
                site.getFavicon(), site.getLayout(), showLang,
                cur == null ? null : cur.getAppName(),
                cur == null ? null : cur.getTitle(),
                cur == null ? null : cur.getDescription(),
                langs);
    }

    /** 过滤出已发布(status∈{2,3})的文章id,保持入参顺序、去重。 */
    private List<Long> publishedArticleIds(List<Long> articleIds) {
        List<Long> distinct = articleIds.stream().distinct().toList();
        if (distinct.isEmpty()) {
            return List.of();
        }
        Set<Long> published = articleMapper.selectBatchIds(distinct).stream()
                .filter(a -> a.getStatus() != null && a.getStatus() >= 2)
                .map(WikiArticle::getId).collect(Collectors.toSet());
        return distinct.stream().filter(published::contains).toList();
    }

    private Map<Long, WikiArticle> articleMap(List<Long> ids) {
        if (ids.isEmpty()) {
            return Map.of();
        }
        return articleMapper.selectBatchIds(ids).stream()
                .collect(Collectors.toMap(WikiArticle::getId, Function.identity()));
    }

    /** 各文章发布标题(pubTitle 优先,空回退草稿 title);按语言、空回退默认语言。 */
    private Map<Long, String> publishedTitles(List<Long> ids, String lang) {
        Map<Long, WikiArticleI18n> snap = publishedSnapshots(ids, lang);
        Map<Long, String> r = new LinkedHashMap<>();
        snap.forEach((aid, i) -> r.put(aid, StringUtils.hasText(i.getPubTitle()) ? i.getPubTitle() : i.getTitle()));
        return r;
    }

    /** 各文章的发布快照 i18n(按语言取,空回退默认语言)。 */
    private Map<Long, WikiArticleI18n> publishedSnapshots(List<Long> ids, String lang) {
        if (ids.isEmpty()) {
            return Map.of();
        }
        Map<Long, List<WikiArticleI18n>> byArticle = articleI18nMapper.selectList(Wrappers.<WikiArticleI18n>lambdaQuery()
                        .in(WikiArticleI18n::getArticleId, ids))
                .stream().collect(Collectors.groupingBy(WikiArticleI18n::getArticleId));
        Map<Long, WikiArticleI18n> r = new LinkedHashMap<>();
        for (Long aid : ids) {
            List<WikiArticleI18n> rows = byArticle.getOrDefault(aid, List.of());
            WikiArticleI18n i = pick(rows, lang, DEFAULT_LANG, WikiArticleI18n::getLang);
            if (i != null) {
                r.put(aid, i);
            }
        }
        return r;
    }

    private WikiCategoryPublicVO.ArticleCard toCard(Long articleId, Map<Long, WikiArticle> artMap, Map<Long, WikiArticleI18n> snapMap) {
        WikiArticle a = artMap.get(articleId);
        WikiArticleI18n i = snapMap.get(articleId);
        String title = i == null ? null : (StringUtils.hasText(i.getPubTitle()) ? i.getPubTitle() : i.getTitle());
        String summary = i == null ? null : (StringUtils.hasText(i.getPubSummary()) ? i.getPubSummary() : i.getSummary());
        return new WikiCategoryPublicVO.ArticleCard(a == null ? null : a.getShareCode(), title, summary,
                a == null ? null : a.getUpdateTime());
    }

    private Map<Long, String> categoryNames(List<Long> categoryIds, String lang) {
        return i18nText(categoryI18nMapper.selectList(Wrappers.<WikiCategoryI18n>lambdaQuery()
                        .in(WikiCategoryI18n::getCategoryId, categoryIds)),
                WikiCategoryI18n::getCategoryId, WikiCategoryI18n::getLang, WikiCategoryI18n::getName, lang);
    }

    private Map<Long, String> categoryDescriptions(List<Long> categoryIds, String lang) {
        return i18nText(categoryI18nMapper.selectList(Wrappers.<WikiCategoryI18n>lambdaQuery()
                        .in(WikiCategoryI18n::getCategoryId, categoryIds)),
                WikiCategoryI18n::getCategoryId, WikiCategoryI18n::getLang, WikiCategoryI18n::getDescription, lang);
    }

    private Map<Long, String> groupNames(List<WikiGroup> groups, String lang) {
        if (groups.isEmpty()) {
            return Map.of();
        }
        List<Long> ids = groups.stream().map(WikiGroup::getId).toList();
        return i18nText(groupI18nMapper.selectList(Wrappers.<WikiGroupI18n>lambdaQuery()
                        .in(WikiGroupI18n::getGroupId, ids)),
                WikiGroupI18n::getGroupId, WikiGroupI18n::getLang, WikiGroupI18n::getName, lang);
    }

    /** 通用:一批 i18n 行按 ownerId 归并,取指定语言文案(空回退默认语言)。 */
    private <T> Map<Long, String> i18nText(List<T> rows, Function<T, Long> ownerOf, Function<T, String> langOf,
                                           Function<T, String> textOf, String lang) {
        Map<Long, List<T>> byOwner = rows.stream().collect(Collectors.groupingBy(ownerOf));
        Map<Long, String> r = new LinkedHashMap<>();
        byOwner.forEach((owner, list) -> {
            String text = list.stream().filter(x -> lang.equals(langOf.apply(x))).map(textOf).filter(StringUtils::hasText).findFirst()
                    .or(() -> list.stream().filter(x -> DEFAULT_LANG.equals(langOf.apply(x))).map(textOf).filter(StringUtils::hasText).findFirst())
                    .orElse(null);
            r.put(owner, text);
        });
        return r;
    }

    /** 从 i18n 行集合按语言挑一条(空回退默认语言,再回退首条)。 */
    private <T> T pick(List<T> rows, String lang, String defaultLang, Function<T, String> langOf) {
        return rows.stream().filter(x -> lang.equals(langOf.apply(x))).findFirst()
                .or(() -> rows.stream().filter(x -> defaultLang.equals(langOf.apply(x))).findFirst())
                .or(() -> rows.stream().findFirst())
                .orElse(null);
    }
}
