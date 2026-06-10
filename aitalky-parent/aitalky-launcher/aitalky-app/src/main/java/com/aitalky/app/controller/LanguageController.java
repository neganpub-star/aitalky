package com.aitalky.app.controller;

import com.aitalky.common.api.R;
import com.aitalky.platform.dto.LanguageVO;
import com.aitalky.platform.service.LanguageService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 语种字典(租户端只读)。
 * <p>console 取「可选语种全集」候选项(替代前端常量),实现新增语种无需改前端代码;
 * 数据源为平台 pf_language 启用项(后管维护)。
 */
@RestController
@RequestMapping("/api/languages")
@RequiredArgsConstructor
public class LanguageController {

    private final LanguageService languageService;

    /** 启用中的语种全集(按 sort) */
    @GetMapping
    public R<List<LanguageVO>> list() {
        return R.ok(languageService.listEnabled());
    }
}
