package com.aitalky.wiki.service.impl;

import com.aitalky.common.api.ResultCode;
import com.aitalky.common.exception.BizException;
import com.aitalky.common.id.SnowflakeIdGenerator;
import com.aitalky.wiki.dto.ArticleReq;
import com.aitalky.wiki.dto.WikiArticleDetailVO;
import com.aitalky.wiki.dto.WikiArticleHistoryVO;
import com.aitalky.wiki.dto.WikiArticleRowVO;
import com.aitalky.wiki.entity.WikiArticle;
import com.aitalky.wiki.entity.WikiArticleHistory;
import com.aitalky.wiki.entity.WikiArticleI18n;
import com.aitalky.wiki.mapper.WikiArticleHistoryMapper;
import com.aitalky.wiki.mapper.WikiArticleI18nMapper;
import com.aitalky.wiki.mapper.WikiArticleMapper;
import com.aitalky.wiki.mapper.WikiCategoryArticleMapper;
import com.aitalky.wiki.entity.WikiCategoryArticle;
import com.aitalky.wiki.service.WikiArticleService;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.security.SecureRandom;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * wiki 文章管理实现。状态机:1未发布 / 2已发布 / 3有变更。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class WikiArticleServiceImpl implements WikiArticleService {

    private static final String DEFAULT_LANG = "zh_CN";
    private static final int ST_UNPUBLISHED = 1, ST_PUBLISHED = 2, ST_CHANGED = 3;
    private static final int ACT_CREATE = 1, ACT_EDIT = 2, ACT_PUBLISH = 3, ACT_UNPUBLISH = 4;
    private static final char[] CODE = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".toCharArray();
    private static final SecureRandom RND = new SecureRandom();

    private final WikiArticleMapper articleMapper;
    private final WikiArticleI18nMapper i18nMapper;
    private final WikiArticleHistoryMapper historyMapper;
    private final WikiCategoryArticleMapper categoryArticleMapper;
    private final SnowflakeIdGenerator idGenerator;
    private final ObjectMapper objectMapper;

    @Override
    public List<WikiArticleRowVO> list(Integer status, String lang) {
        String showLang = StringUtils.hasText(lang) ? lang : DEFAULT_LANG;
        var wrapper = Wrappers.<WikiArticle>lambdaQuery();
        if (status != null && status == ST_UNPUBLISHED) {
            wrapper.eq(WikiArticle::getStatus, ST_UNPUBLISHED);
        } else if (status != null && status == ST_PUBLISHED) {
            wrapper.in(WikiArticle::getStatus, ST_PUBLISHED, ST_CHANGED); // 已发布含有变更
        }
        wrapper.orderByDesc(WikiArticle::getUpdateTime).orderByDesc(WikiArticle::getId);
        List<WikiArticle> articles = articleMapper.selectList(wrapper);
        if (articles.isEmpty()) {
            return List.of();
        }
        List<Long> ids = articles.stream().map(WikiArticle::getId).toList();
        // 各文章的 i18n 行(统计语言数 + 取展示语言标题)
        Map<Long, List<WikiArticleI18n>> byArticle = new LinkedHashMap<>();
        for (WikiArticleI18n r : i18nMapper.selectList(Wrappers.<WikiArticleI18n>lambdaQuery().in(WikiArticleI18n::getArticleId, ids))) {
            byArticle.computeIfAbsent(r.getArticleId(), k -> new java.util.ArrayList<>()).add(r);
        }
        return articles.stream().map(a -> {
            List<WikiArticleI18n> rows = byArticle.getOrDefault(a.getId(), List.of());
            long langCount = rows.stream().filter(r -> StringUtils.hasText(r.getTitle()) || StringUtils.hasText(r.getContent())).count();
            String title = rows.stream().filter(r -> showLang.equals(r.getLang())).map(WikiArticleI18n::getTitle).findFirst()
                    .filter(StringUtils::hasText)
                    // 展示语言无标题时回退默认语言
                    .or(() -> rows.stream().filter(r -> DEFAULT_LANG.equals(r.getLang())).map(WikiArticleI18n::getTitle).filter(StringUtils::hasText).findFirst())
                    .orElse(null);
            return new WikiArticleRowVO(a.getId(), title, a.getStatus(), (int) langCount, a.getIsRecommend(),
                    a.getUpdateBy(), null, null, a.getUpdateTime(), a.getShareCode());
        }).toList();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Long create() {
        WikiArticle a = new WikiArticle();
        a.setId(idGenerator.nextId());
        a.setStatus(ST_UNPUBLISHED);
        a.setIsRecommend(0);
        articleMapper.insert(a);
        addHistory(a.getId(), ACT_CREATE);
        log.info("新建 wiki 文章 articleId={}", a.getId());
        return a.getId();
    }

    @Override
    public WikiArticleDetailVO detail(Long articleId) {
        WikiArticle a = getOwned(articleId);
        List<WikiArticleDetailVO.I18n> i18ns = i18nMapper.selectList(Wrappers.<WikiArticleI18n>lambdaQuery()
                        .eq(WikiArticleI18n::getArticleId, articleId))
                .stream().map(r -> new WikiArticleDetailVO.I18n(r.getLang(), r.getTitle(), r.getSummary(), r.getContent(),
                        r.getPubTitle(), r.getPubSummary(), r.getPubContent(), r.getPublished()))
                .toList();
        return new WikiArticleDetailVO(a.getId(), a.getStatus(), a.getIsRecommend(), a.getShareCode(),
                a.getUpdateBy(), null, null, a.getUpdateTime(), i18ns);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void saveDraft(Long articleId, ArticleReq.SaveDraft req) {
        WikiArticle a = getOwned(articleId);
        String lang = StringUtils.hasText(req.lang()) ? req.lang() : DEFAULT_LANG;
        WikiArticleI18n row = i18nMapper.selectOne(Wrappers.<WikiArticleI18n>lambdaQuery()
                .eq(WikiArticleI18n::getArticleId, articleId).eq(WikiArticleI18n::getLang, lang).last("limit 1"));
        if (row == null) {
            row = new WikiArticleI18n();
            row.setId(idGenerator.nextId());
            row.setArticleId(articleId);
            row.setLang(lang);
            row.setPublished(0);
            row.setTitle(req.title());
            row.setSummary(req.summary());
            row.setContent(req.content());
            i18nMapper.insert(row);
        } else {
            row.setTitle(req.title());
            row.setSummary(req.summary());
            row.setContent(req.content());
            i18nMapper.updateById(row);
        }
        recomputeStatus(a);
        addHistory(articleId, ACT_EDIT);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void publish(Long articleId) {
        WikiArticle a = getOwned(articleId);
        List<WikiArticleI18n> rows = i18nMapper.selectList(Wrappers.<WikiArticleI18n>lambdaQuery()
                .eq(WikiArticleI18n::getArticleId, articleId));
        boolean any = false;
        for (WikiArticleI18n r : rows) {
            // 仅发布有内容的语言;空语言不发
            if (!StringUtils.hasText(r.getTitle()) && !StringUtils.hasText(r.getContent())) {
                continue;
            }
            r.setPubTitle(r.getTitle());
            r.setPubSummary(r.getSummary());
            r.setPubContent(r.getContent());
            r.setPublished(1);
            i18nMapper.updateById(r);
            any = true;
        }
        if (!any) {
            throw new BizException(ResultCode.PARAM_INVALID); // 无任何内容,不可发布
        }
        if (!StringUtils.hasText(a.getShareCode())) {
            a.setShareCode(randomCode());
        }
        a.setStatus(ST_PUBLISHED);
        articleMapper.updateById(a);
        addHistory(articleId, ACT_PUBLISH);
        log.info("发布 wiki 文章 articleId={}", articleId);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void unpublish(Long articleId) {
        WikiArticle a = getOwned(articleId);
        i18nMapper.update(null, Wrappers.<WikiArticleI18n>lambdaUpdate()
                .eq(WikiArticleI18n::getArticleId, articleId)
                .set(WikiArticleI18n::getPublished, 0));
        a.setStatus(ST_UNPUBLISHED);
        articleMapper.updateById(a);
        addHistory(articleId, ACT_UNPUBLISH);
        log.info("取消发布 wiki 文章 articleId={}", articleId);
    }

    @Override
    public void toggleRecommend(Long articleId, Integer recommend) {
        WikiArticle a = getOwned(articleId);
        a.setIsRecommend(recommend == null ? 0 : recommend);
        articleMapper.updateById(a);
    }

    @Override
    public List<WikiArticleHistoryVO> historyList(Long articleId) {
        getOwned(articleId);
        return historyMapper.selectList(Wrappers.<WikiArticleHistory>lambdaQuery()
                        .eq(WikiArticleHistory::getArticleId, articleId)
                        .orderByDesc(WikiArticleHistory::getId))
                .stream().map(h -> new WikiArticleHistoryVO(h.getId(), h.getAction(), h.getOperatorId(), null, null, h.getCreateTime()))
                .toList();
    }

    @Override
    public String historySnapshot(Long historyId) {
        WikiArticleHistory h = historyMapper.selectById(historyId);
        if (h == null) {
            throw new BizException(ResultCode.NOT_FOUND);
        }
        return h.getSnapshot();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void delete(Long articleId) {
        getOwned(articleId);
        articleMapper.deleteById(articleId);
        i18nMapper.delete(Wrappers.<WikiArticleI18n>lambdaQuery().eq(WikiArticleI18n::getArticleId, articleId));
        historyMapper.delete(Wrappers.<WikiArticleHistory>lambdaQuery().eq(WikiArticleHistory::getArticleId, articleId));
        // 物理删除类别关联(join 表无 del_flag)
        categoryArticleMapper.delete(Wrappers.<WikiCategoryArticle>lambdaQuery().eq(WikiCategoryArticle::getArticleId, articleId));
        log.info("删除 wiki 文章 articleId={}", articleId);
    }

    /** 重算状态:无已发布语言→未发布;有已发布且草稿==发布→已发布;有差异→有变更。 */
    private void recomputeStatus(WikiArticle a) {
        List<WikiArticleI18n> rows = i18nMapper.selectList(Wrappers.<WikiArticleI18n>lambdaQuery()
                .eq(WikiArticleI18n::getArticleId, a.getId()));
        boolean anyPublished = rows.stream().anyMatch(r -> Integer.valueOf(1).equals(r.getPublished()));
        int status;
        if (!anyPublished) {
            status = ST_UNPUBLISHED;
        } else {
            boolean diff = rows.stream().filter(r -> Integer.valueOf(1).equals(r.getPublished())).anyMatch(r ->
                    !Objects.equals(r.getTitle(), r.getPubTitle())
                            || !Objects.equals(r.getSummary(), r.getPubSummary())
                            || !Objects.equals(r.getContent(), r.getPubContent()));
            status = diff ? ST_CHANGED : ST_PUBLISHED;
        }
        if (!Objects.equals(status, a.getStatus())) {
            a.setStatus(status);
            articleMapper.updateById(a);
        }
    }

    /** 记历史:存当前各语言草稿快照(JSON)。 */
    private void addHistory(Long articleId, int action) {
        Map<String, Map<String, String>> snap = new LinkedHashMap<>();
        for (WikiArticleI18n r : i18nMapper.selectList(Wrappers.<WikiArticleI18n>lambdaQuery().eq(WikiArticleI18n::getArticleId, articleId))) {
            Map<String, String> m = new LinkedHashMap<>();
            m.put("title", r.getTitle());
            m.put("summary", r.getSummary());
            m.put("content", r.getContent());
            snap.put(r.getLang(), m);
        }
        WikiArticleHistory h = new WikiArticleHistory();
        h.setId(idGenerator.nextId());
        h.setArticleId(articleId);
        h.setAction(action);
        h.setOperatorId(com.aitalky.framework.tenant.TenantContext.getMemberId());
        try {
            h.setSnapshot(objectMapper.writeValueAsString(snap));
        } catch (Exception e) {
            h.setSnapshot("{}"); // 序列化失败不阻断主流程
        }
        historyMapper.insert(h);
    }

    private WikiArticle getOwned(Long articleId) {
        WikiArticle a = articleMapper.selectById(articleId);
        if (a == null) {
            throw new BizException(ResultCode.NOT_FOUND);
        }
        return a;
    }

    private String randomCode() {
        StringBuilder sb = new StringBuilder(8);
        for (int i = 0; i < 8; i++) {
            sb.append(CODE[RND.nextInt(CODE.length)]);
        }
        return sb.toString();
    }
}
