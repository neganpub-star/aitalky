package com.aitalky.app.controller;

import com.aitalky.common.api.R;
import com.aitalky.common.api.ResultCode;
import com.aitalky.common.exception.BizException;
import com.aitalky.identity.entity.IdProject;
import com.aitalky.identity.service.ProjectService;
import com.aitalky.wiki.dto.WikiArticleDetailVO;
import com.aitalky.wiki.dto.WikiArticleRowVO;
import com.aitalky.wiki.dto.WikiCategoryPublicVO;
import com.aitalky.wiki.dto.WikiSitePublicVO;
import com.aitalky.wiki.service.WikiArticleService;
import com.aitalky.wiki.service.WikiPublicService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * wiki 对外公开接口(免登录,白名单 /api/public/**)。
 * <ul>
 *   <li>文章阅读页:按外链码取已发布文章(对外只见发布快照)。</li>
 *   <li>信使首页推荐:按 appId 取项目推荐文章(已发布+推荐,最多 5 篇)。</li>
 * </ul>
 * 无租户上下文:byShareCode 靠全局唯一外链码;recommended 由 appId 解析 projectId 后显式过滤。
 */
@RestController
@RequestMapping("/api/public/wiki")
@RequiredArgsConstructor
public class PublicWikiController {

    /** 信使首页推荐文章最多展示篇数(对齐参考)。 */
    private static final int RECOMMEND_MAX = 5;

    private final WikiArticleService articleService;
    private final WikiPublicService publicService;
    private final ProjectService projectService;

    /** 对外文章阅读页:按外链码取已发布文章。 */
    @GetMapping("/article/{shareCode}")
    public R<WikiArticleDetailVO> article(@PathVariable String shareCode) {
        return R.ok(articleService.byShareCode(shareCode));
    }

    /** 对外站点首页:按站点 shareCode 取头部 + 分类区块(已发布文章)。 */
    @GetMapping("/site/{shareCode}")
    public R<WikiSitePublicVO> site(@PathVariable String shareCode, @RequestParam(required = false) String lang) {
        return R.ok(publicService.site(shareCode, lang));
    }

    /** 对外站点分类页:按站点 shareCode + 分类id 取分组文章。 */
    @GetMapping("/site/{shareCode}/category/{categoryId}")
    public R<WikiCategoryPublicVO> category(@PathVariable String shareCode, @PathVariable Long categoryId,
                                            @RequestParam(required = false) String lang) {
        return R.ok(publicService.category(shareCode, categoryId, lang));
    }

    /** 对外站点站内搜索:标题/摘要命中的已发布文章。 */
    @GetMapping("/site/{shareCode}/search")
    public R<List<WikiCategoryPublicVO.ArticleCard>> search(@PathVariable String shareCode,
                                                            @RequestParam String q, @RequestParam(required = false) String lang) {
        return R.ok(publicService.search(shareCode, q, lang));
    }

    /** 信使首页推荐文章列表。 */
    @GetMapping("/recommended")
    public R<List<WikiArticleRowVO>> recommended(@RequestParam String appId, @RequestParam(required = false) String lang) {
        IdProject project = projectService.findByAppId(appId);
        if (project == null) {
            throw new BizException(ResultCode.PROJECT_NOT_FOUND);
        }
        return R.ok(articleService.recommended(project.getId(), lang, RECOMMEND_MAX));
    }
}
