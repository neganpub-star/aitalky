package com.aitalky.app.controller;

import com.aitalky.common.api.R;
import com.aitalky.framework.web.RequiresFunction;
import com.aitalky.wiki.dto.SiteReq;
import com.aitalky.wiki.dto.WikiSiteDetailVO;
import com.aitalky.wiki.dto.WikiSiteVO;
import com.aitalky.wiki.service.WikiSiteService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * wiki 站点(应用)管理(知识库 → 应用)。功能码对齐 PermissionCatalog:
 * 读=任一 wiki.app.* 功能;创建=wiki.app.create;站点配置/开关=wiki.app.site;样式=wiki.app.style;删除=wiki.app.delete。
 * (wiki.app 是页面 token 控前端菜单可见,鉴权只看 functions[],故读用 wiki.app.* 兜底。)
 */
@RestController
@RequestMapping("/api/wiki/sites")
@RequiredArgsConstructor
public class WikiSiteController {

    // 读接口:拥有任一 wiki.app 管理功能即可查看(注解值须内联数组字面量,不能引用常量)
    private final WikiSiteService siteService;

    @GetMapping
    @RequiresFunction({"wiki.app.create", "wiki.app.site", "wiki.app.style", "wiki.app.content", "wiki.app.delete"})
    public R<List<WikiSiteVO>> list() {
        return R.ok(siteService.listSites());
    }

    @GetMapping("/{id}")
    @RequiresFunction({"wiki.app.create", "wiki.app.site", "wiki.app.style", "wiki.app.content", "wiki.app.delete"})
    public R<WikiSiteDetailVO> detail(@PathVariable Long id) {
        return R.ok(siteService.detail(id));
    }

    /** 子域可用性校验(创建/编辑时实时校验)。 */
    @GetMapping("/subdomain-available")
    @RequiresFunction({"wiki.app.create", "wiki.app.site", "wiki.app.style", "wiki.app.content", "wiki.app.delete"})
    public R<Boolean> subdomainAvailable(@RequestParam String subdomain, @RequestParam(required = false) Long excludeSiteId) {
        return R.ok(siteService.subdomainAvailable(subdomain, excludeSiteId));
    }

    @PostMapping
    @RequiresFunction("wiki.app.create")
    public R<Long> create(@RequestBody SiteReq.Create req) {
        return R.ok(siteService.createCustomSite(req));
    }

    @PutMapping("/{id}/config")
    @RequiresFunction("wiki.app.site")
    public R<Void> saveConfig(@PathVariable Long id, @RequestBody SiteReq.SaveConfig req) {
        siteService.saveConfig(id, req);
        return R.ok();
    }

    @PutMapping("/{id}/style")
    @RequiresFunction("wiki.app.style")
    public R<Void> saveStyle(@PathVariable Long id, @RequestBody SiteReq.SaveStyle req) {
        siteService.saveStyle(id, req);
        return R.ok();
    }

    @PutMapping("/{id}/enabled")
    @RequiresFunction("wiki.app.site")
    public R<Void> toggleEnabled(@PathVariable Long id, @RequestBody Map<String, Integer> body) {
        siteService.toggleEnabled(id, body.get("enabled"));
        return R.ok();
    }

    @DeleteMapping("/{id}")
    @RequiresFunction("wiki.app.delete")
    public R<Void> delete(@PathVariable Long id) {
        siteService.deleteSite(id);
        return R.ok();
    }
}
