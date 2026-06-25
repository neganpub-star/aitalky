package com.aitalky.wiki.dto;

import java.util.List;

/**
 * wiki 内容配置(类别/分组/关联)请求体。多语言文案按 lang 列表传(默认语言必填)。
 */
public final class CategoryReq {

    private CategoryReq() {
    }

    /** 单语言文案(类别:name+description;分组:仅 name)。 */
    public record I18nText(String lang, String name, String description) {
    }

    /** 新增/编辑类别:图标 + 各语言 名称/描述。 */
    public record SaveCategory(String icon, List<I18nText> i18ns) {
    }

    /** 新增/编辑分组:各语言 名称。 */
    public record SaveGroup(List<I18nText> i18ns) {
    }

    /** 关联文章到 类别/分组(groupId=0 直接挂类别)。 */
    public record LinkArticles(Long groupId, List<Long> articleIds) {
    }

    /** 排序:有序 id 列表(类别/分组/关联文章通用)。 */
    public record Sort(List<Long> ids) {
    }
}
