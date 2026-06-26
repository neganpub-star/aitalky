package com.aitalky.wiki.dto;

import java.util.List;

/**
 * 对外站点公共头部(首页/分类页/搜索页共用):品牌/主题/当前语言文案 + 可选语言列表。
 *
 * @param lang        当前生效语言
 * @param appName     当前语言下应用名(顶栏品牌名右侧)
 * @param title       当前语言下站点标题(首页 banner 大标题)
 * @param description 当前语言下站点描述(首页 banner 副标题)
 * @param langs       站点可切换语言(多语言开启时含 en_US)
 */
public record WikiSiteHeaderVO(
        String shareCode,
        String logo,
        String brandShort,
        String themeColor,
        String favicon,
        Integer layout,
        String lang,
        String appName,
        String title,
        String description,
        List<String> langs
) {
}
