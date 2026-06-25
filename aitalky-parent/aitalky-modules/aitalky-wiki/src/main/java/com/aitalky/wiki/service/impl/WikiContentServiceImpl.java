package com.aitalky.wiki.service.impl;

import com.aitalky.common.api.ResultCode;
import com.aitalky.common.exception.BizException;
import com.aitalky.common.id.SnowflakeIdGenerator;
import com.aitalky.wiki.dto.*;
import com.aitalky.wiki.entity.*;
import com.aitalky.wiki.mapper.*;
import com.aitalky.wiki.service.WikiContentService;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * wiki 内容配置实现。类别/分组多语言文案 upsert;关联表物理删除;排序与语言无关。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class WikiContentServiceImpl implements WikiContentService {

    private static final String DEFAULT_LANG = "zh_CN";

    private final WikiCategoryMapper categoryMapper;
    private final WikiCategoryI18nMapper categoryI18nMapper;
    private final WikiGroupMapper groupMapper;
    private final WikiGroupI18nMapper groupI18nMapper;
    private final WikiCategoryArticleMapper linkMapper;
    private final WikiArticleMapper articleMapper;
    private final WikiArticleI18nMapper articleI18nMapper;
    private final SnowflakeIdGenerator idGenerator;

    // ===================== 类别 =====================

    @Override
    public List<CategoryVO> listCategories(Long siteId, String lang) {
        String showLang = StringUtils.hasText(lang) ? lang : DEFAULT_LANG;
        List<WikiCategory> cats = categoryMapper.selectList(Wrappers.<WikiCategory>lambdaQuery()
                .eq(WikiCategory::getSiteId, siteId)
                .orderByAsc(WikiCategory::getSort).orderByAsc(WikiCategory::getId));
        if (cats.isEmpty()) {
            return List.of();
        }
        List<Long> catIds = cats.stream().map(WikiCategory::getId).toList();
        // 各类别 i18n
        Map<Long, List<WikiCategoryI18n>> i18nByCat = categoryI18nMapper.selectList(Wrappers.<WikiCategoryI18n>lambdaQuery()
                        .in(WikiCategoryI18n::getCategoryId, catIds))
                .stream().collect(Collectors.groupingBy(WikiCategoryI18n::getCategoryId));
        // 各类别文章数(关联表统计)
        Map<Long, Integer> countByCat = new HashMap<>();
        for (WikiCategoryArticle l : linkMapper.selectList(Wrappers.<WikiCategoryArticle>lambdaQuery().in(WikiCategoryArticle::getCategoryId, catIds))) {
            countByCat.merge(l.getCategoryId(), 1, Integer::sum);
        }
        return cats.stream().map(c -> {
            List<WikiCategoryI18n> rows = i18nByCat.getOrDefault(c.getId(), List.of());
            String name = pickName(rows, showLang, WikiCategoryI18n::getLang, WikiCategoryI18n::getName);
            String desc = rows.stream().filter(r -> showLang.equals(r.getLang())).map(WikiCategoryI18n::getDescription).findFirst().orElse(null);
            List<CategoryReq.I18nText> i18ns = rows.stream()
                    .map(r -> new CategoryReq.I18nText(r.getLang(), r.getName(), r.getDescription())).toList();
            return new CategoryVO(c.getId(), c.getIcon(), name, desc, c.getSort(), countByCat.getOrDefault(c.getId(), 0), i18ns);
        }).toList();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Long createCategory(Long siteId, CategoryReq.SaveCategory req) {
        WikiCategory c = new WikiCategory();
        c.setId(idGenerator.nextId());
        c.setSiteId(siteId);
        c.setIcon(req.icon());
        c.setSort(0);
        categoryMapper.insert(c);
        upsertCategoryI18n(c.getId(), req.i18ns());
        return c.getId();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void updateCategory(Long categoryId, CategoryReq.SaveCategory req) {
        WikiCategory c = ownedCategory(categoryId);
        c.setIcon(req.icon());
        categoryMapper.updateById(c);
        upsertCategoryI18n(categoryId, req.i18ns());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteCategory(Long categoryId) {
        ownedCategory(categoryId);
        // 分组 + 分组文案
        List<Long> groupIds = groupMapper.selectList(Wrappers.<WikiGroup>lambdaQuery().eq(WikiGroup::getCategoryId, categoryId))
                .stream().map(WikiGroup::getId).toList();
        if (!groupIds.isEmpty()) {
            groupI18nMapper.delete(Wrappers.<WikiGroupI18n>lambdaQuery().in(WikiGroupI18n::getGroupId, groupIds));
            groupMapper.delete(Wrappers.<WikiGroup>lambdaQuery().eq(WikiGroup::getCategoryId, categoryId));
        }
        // 关联(物理删) + 类别文案 + 类别
        linkMapper.delete(Wrappers.<WikiCategoryArticle>lambdaQuery().eq(WikiCategoryArticle::getCategoryId, categoryId));
        categoryI18nMapper.delete(Wrappers.<WikiCategoryI18n>lambdaQuery().eq(WikiCategoryI18n::getCategoryId, categoryId));
        categoryMapper.deleteById(categoryId);
        log.info("删除 wiki 类别 categoryId={}", categoryId);
    }

    @Override
    public void sortCategories(Long siteId, List<Long> orderedIds) {
        applySort(orderedIds, id -> {
            WikiCategory c = categoryMapper.selectById(id);
            return (c != null && c.getSiteId().equals(siteId)) ? c : null;
        }, (c, sort) -> { c.setSort(sort); categoryMapper.updateById(c); });
    }

    @Override
    public CategoryDetailVO categoryDetail(Long categoryId, String lang) {
        String showLang = StringUtils.hasText(lang) ? lang : DEFAULT_LANG;
        WikiCategory c = ownedCategory(categoryId);
        List<WikiCategoryI18n> catI18n = categoryI18nMapper.selectList(Wrappers.<WikiCategoryI18n>lambdaQuery().eq(WikiCategoryI18n::getCategoryId, categoryId));
        String name = pickName(catI18n, showLang, WikiCategoryI18n::getLang, WikiCategoryI18n::getName);
        String desc = catI18n.stream().filter(r -> showLang.equals(r.getLang())).map(WikiCategoryI18n::getDescription).findFirst().orElse(null);

        // 所有关联,按分组归并
        List<WikiCategoryArticle> links = linkMapper.selectList(Wrappers.<WikiCategoryArticle>lambdaQuery()
                .eq(WikiCategoryArticle::getCategoryId, categoryId)
                .orderByAsc(WikiCategoryArticle::getSort).orderByAsc(WikiCategoryArticle::getId));
        // 文章标题/状态(批量)
        List<Long> articleIds = links.stream().map(WikiCategoryArticle::getArticleId).distinct().toList();
        Map<Long, WikiArticle> artMap = articleIds.isEmpty() ? Map.of()
                : articleMapper.selectBatchIds(articleIds).stream().collect(Collectors.toMap(WikiArticle::getId, Function.identity()));
        Map<Long, String> titleMap = articleTitles(articleIds, showLang);

        // 直接挂类别(groupId=0)
        List<CategoryDetailVO.LinkedArticle> direct = links.stream().filter(l -> l.getGroupId() == null || l.getGroupId() == 0)
                .map(l -> toLinked(l, artMap, titleMap)).toList();
        // 分组
        List<WikiGroup> groups = groupMapper.selectList(Wrappers.<WikiGroup>lambdaQuery()
                .eq(WikiGroup::getCategoryId, categoryId).orderByAsc(WikiGroup::getSort).orderByAsc(WikiGroup::getId));
        Map<Long, String> groupNames = groupNames(groups, showLang);
        Map<Long, List<WikiCategoryArticle>> linksByGroup = links.stream()
                .filter(l -> l.getGroupId() != null && l.getGroupId() != 0)
                .collect(Collectors.groupingBy(WikiCategoryArticle::getGroupId));
        List<CategoryDetailVO.Group> groupVos = groups.stream().map(g -> new CategoryDetailVO.Group(
                g.getId(), groupNames.get(g.getId()), g.getSort(),
                linksByGroup.getOrDefault(g.getId(), List.of()).stream().map(l -> toLinked(l, artMap, titleMap)).toList()
        )).toList();

        return new CategoryDetailVO(c.getId(), c.getIcon(), name, desc, direct, groupVos);
    }

    // ===================== 分组 =====================

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Long createGroup(Long categoryId, CategoryReq.SaveGroup req) {
        ownedCategory(categoryId);
        WikiGroup g = new WikiGroup();
        g.setId(idGenerator.nextId());
        g.setCategoryId(categoryId);
        g.setSort(0);
        groupMapper.insert(g);
        upsertGroupI18n(g.getId(), req.i18ns());
        return g.getId();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void updateGroup(Long groupId, CategoryReq.SaveGroup req) {
        ownedGroup(groupId);
        upsertGroupI18n(groupId, req.i18ns());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteGroup(Long groupId) {
        ownedGroup(groupId);
        // 其下文章关联改挂回类别(groupId=0),不删文章
        linkMapper.update(null, Wrappers.<WikiCategoryArticle>lambdaUpdate()
                .eq(WikiCategoryArticle::getGroupId, groupId).set(WikiCategoryArticle::getGroupId, 0L));
        groupI18nMapper.delete(Wrappers.<WikiGroupI18n>lambdaQuery().eq(WikiGroupI18n::getGroupId, groupId));
        groupMapper.deleteById(groupId);
    }

    @Override
    public void sortGroups(Long categoryId, List<Long> orderedIds) {
        applySort(orderedIds, id -> {
            WikiGroup g = groupMapper.selectById(id);
            return (g != null && g.getCategoryId().equals(categoryId)) ? g : null;
        }, (g, sort) -> { g.setSort(sort); groupMapper.updateById(g); });
    }

    // ===================== 关联文章 =====================

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void linkArticles(Long categoryId, CategoryReq.LinkArticles req) {
        ownedCategory(categoryId);
        long groupId = req.groupId() == null ? 0L : req.groupId();
        if (req.articleIds() == null || req.articleIds().isEmpty()) {
            return;
        }
        // 已关联到本类别的文章(uk=category+article,不能重复关联到同类别)
        Set<Long> existing = linkMapper.selectList(Wrappers.<WikiCategoryArticle>lambdaQuery().eq(WikiCategoryArticle::getCategoryId, categoryId))
                .stream().map(WikiCategoryArticle::getArticleId).collect(Collectors.toSet());
        for (Long articleId : req.articleIds()) {
            if (existing.contains(articleId)) {
                continue;
            }
            WikiCategoryArticle l = new WikiCategoryArticle();
            l.setId(idGenerator.nextId());
            l.setCategoryId(categoryId);
            l.setGroupId(groupId);
            l.setArticleId(articleId);
            l.setSort(0);
            linkMapper.insert(l);
        }
    }

    @Override
    public void unlinkArticle(Long linkId) {
        // 物理删(join 表无 del_flag);租户拦截器保证只能删本项目
        linkMapper.deleteById(linkId);
    }

    @Override
    public void sortArticles(Long categoryId, Long groupId, List<Long> orderedLinkIds) {
        long gid = groupId == null ? 0L : groupId;
        applySort(orderedLinkIds, id -> {
            WikiCategoryArticle l = linkMapper.selectById(id);
            return (l != null && l.getCategoryId().equals(categoryId) && (l.getGroupId() == null ? 0L : l.getGroupId()) == gid) ? l : null;
        }, (l, sort) -> { l.setSort(sort); linkMapper.updateById(l); });
    }

    @Override
    public List<WikiArticleRowVO> linkableArticles(Long categoryId, String lang) {
        String showLang = StringUtils.hasText(lang) ? lang : DEFAULT_LANG;
        // 排除已关联到本类别的
        Set<Long> linked = linkMapper.selectList(Wrappers.<WikiCategoryArticle>lambdaQuery().eq(WikiCategoryArticle::getCategoryId, categoryId))
                .stream().map(WikiCategoryArticle::getArticleId).collect(Collectors.toSet());
        List<WikiArticle> all = articleMapper.selectList(Wrappers.<WikiArticle>lambdaQuery()
                .orderByDesc(WikiArticle::getStatus) // 已发布优先(状态值大的在前)
                .orderByDesc(WikiArticle::getUpdateTime));
        List<WikiArticle> candidates = all.stream().filter(a -> !linked.contains(a.getId())).toList();
        if (candidates.isEmpty()) {
            return List.of();
        }
        Map<Long, String> titleMap = articleTitles(candidates.stream().map(WikiArticle::getId).toList(), showLang);
        return candidates.stream().map(a -> new WikiArticleRowVO(
                a.getId(), titleMap.get(a.getId()), a.getStatus(), null, a.getIsRecommend(),
                null, null, null, a.getUpdateTime(), a.getShareCode())).toList();
    }

    // ===================== 私有工具 =====================

    private CategoryDetailVO.LinkedArticle toLinked(WikiCategoryArticle l, Map<Long, WikiArticle> artMap, Map<Long, String> titleMap) {
        WikiArticle a = artMap.get(l.getArticleId());
        return new CategoryDetailVO.LinkedArticle(l.getId(), l.getArticleId(),
                titleMap.get(l.getArticleId()), a == null ? null : a.getStatus(), l.getSort());
    }

    /** 批量取文章标题(所选语言,空回退默认语言)。 */
    private Map<Long, String> articleTitles(List<Long> articleIds, String lang) {
        if (articleIds == null || articleIds.isEmpty()) {
            return Map.of();
        }
        Map<Long, String> result = new HashMap<>();
        Map<Long, List<WikiArticleI18n>> byArticle = articleI18nMapper.selectList(Wrappers.<WikiArticleI18n>lambdaQuery()
                        .in(WikiArticleI18n::getArticleId, articleIds))
                .stream().collect(Collectors.groupingBy(WikiArticleI18n::getArticleId));
        for (Long aid : articleIds) {
            List<WikiArticleI18n> rows = byArticle.getOrDefault(aid, List.of());
            String title = rows.stream().filter(r -> lang.equals(r.getLang())).map(WikiArticleI18n::getTitle).filter(StringUtils::hasText).findFirst()
                    .or(() -> rows.stream().filter(r -> DEFAULT_LANG.equals(r.getLang())).map(WikiArticleI18n::getTitle).filter(StringUtils::hasText).findFirst())
                    .orElse(null);
            result.put(aid, title);
        }
        return result;
    }

    private Map<Long, String> groupNames(List<WikiGroup> groups, String lang) {
        if (groups.isEmpty()) {
            return Map.of();
        }
        List<Long> ids = groups.stream().map(WikiGroup::getId).toList();
        Map<Long, List<WikiGroupI18n>> byGroup = groupI18nMapper.selectList(Wrappers.<WikiGroupI18n>lambdaQuery().in(WikiGroupI18n::getGroupId, ids))
                .stream().collect(Collectors.groupingBy(WikiGroupI18n::getGroupId));
        Map<Long, String> result = new HashMap<>();
        for (Long gid : ids) {
            result.put(gid, pickName(byGroup.getOrDefault(gid, List.of()), lang, WikiGroupI18n::getLang, WikiGroupI18n::getName));
        }
        return result;
    }

    /** 取某语言 name,空回退默认语言。 */
    private <T> String pickName(List<T> rows, String lang, Function<T, String> langGetter, Function<T, String> nameGetter) {
        return rows.stream().filter(r -> lang.equals(langGetter.apply(r))).map(nameGetter).filter(StringUtils::hasText).findFirst()
                .or(() -> rows.stream().filter(r -> DEFAULT_LANG.equals(langGetter.apply(r))).map(nameGetter).filter(StringUtils::hasText).findFirst())
                .orElse(null);
    }

    private void upsertCategoryI18n(Long categoryId, List<CategoryReq.I18nText> i18ns) {
        if (i18ns == null) {
            return;
        }
        for (CategoryReq.I18nText t : i18ns) {
            if (!StringUtils.hasText(t.lang())) {
                continue;
            }
            WikiCategoryI18n exist = categoryI18nMapper.selectOne(Wrappers.<WikiCategoryI18n>lambdaQuery()
                    .eq(WikiCategoryI18n::getCategoryId, categoryId).eq(WikiCategoryI18n::getLang, t.lang()).last("limit 1"));
            if (exist == null) {
                WikiCategoryI18n row = new WikiCategoryI18n();
                row.setId(idGenerator.nextId());
                row.setCategoryId(categoryId);
                row.setLang(t.lang());
                row.setName(t.name());
                row.setDescription(t.description());
                categoryI18nMapper.insert(row);
            } else {
                exist.setName(t.name());
                exist.setDescription(t.description());
                categoryI18nMapper.updateById(exist);
            }
        }
    }

    private void upsertGroupI18n(Long groupId, List<CategoryReq.I18nText> i18ns) {
        if (i18ns == null) {
            return;
        }
        for (CategoryReq.I18nText t : i18ns) {
            if (!StringUtils.hasText(t.lang())) {
                continue;
            }
            WikiGroupI18n exist = groupI18nMapper.selectOne(Wrappers.<WikiGroupI18n>lambdaQuery()
                    .eq(WikiGroupI18n::getGroupId, groupId).eq(WikiGroupI18n::getLang, t.lang()).last("limit 1"));
            if (exist == null) {
                WikiGroupI18n row = new WikiGroupI18n();
                row.setId(idGenerator.nextId());
                row.setGroupId(groupId);
                row.setLang(t.lang());
                row.setName(t.name());
                groupI18nMapper.insert(row);
            } else {
                exist.setName(t.name());
                groupI18nMapper.updateById(exist);
            }
        }
    }

    /** 通用排序:按有序 id 依次写 sort=0,1,2…(跳过越权/不存在项)。 */
    private <T> void applySort(List<Long> orderedIds, Function<Long, T> fetch, java.util.function.BiConsumer<T, Integer> setSort) {
        if (orderedIds == null) {
            return;
        }
        int sort = 0;
        for (Long id : orderedIds) {
            T entity = fetch.apply(id);
            if (entity != null) {
                setSort.accept(entity, sort++);
            }
        }
    }

    private WikiCategory ownedCategory(Long categoryId) {
        WikiCategory c = categoryMapper.selectById(categoryId);
        if (c == null) {
            throw new BizException(ResultCode.NOT_FOUND);
        }
        return c;
    }

    private WikiGroup ownedGroup(Long groupId) {
        WikiGroup g = groupMapper.selectById(groupId);
        if (g == null) {
            throw new BizException(ResultCode.NOT_FOUND);
        }
        return g;
    }
}
