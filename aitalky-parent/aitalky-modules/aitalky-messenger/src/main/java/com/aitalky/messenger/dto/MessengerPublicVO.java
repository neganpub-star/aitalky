package com.aitalky.messenger.dto;

/**
 * 信使端公开配置(init 带出):展示所需公开字段 + 当前语言的问候语/团队介绍/紧急通知 + 行为开关。
 * <p>行为开关(系统消息显示/弹窗提醒/客户撤回)供信使端据以渲染;不暴露保存天数等纯后管配置,也不暴露其它语言内容。
 */
public record MessengerPublicVO(
        String brandName,
        String logo,
        String webTitle,
        String webIcon,
        String replyTime,
        String greeting,
        String teamIntro,
        String urgentNotice,
        boolean urgentEnabled,
        // —— 行为开关(信使设置)——
        boolean sysMsgUnread,        // 信使侧显示"未读"分割
        boolean sysMsgTyping,        // 信使侧显示"对方正在输入中"
        boolean sysMsgMemberRetract, // 坐席撤回时信使侧显示系统消息(关则静默移除)
        boolean popupEnabled,        // 新消息弹窗提醒(除声音外)
        boolean popupAllowClose,     // 允许客户手动关闭弹窗
        boolean customerRetractEnabled, // 客户可撤回自己消息
        // 信使端最终生效语言(URL ?lang= 优先,否则信使设置默认语言);信使端据此显示系统提示文案
        String lang,
        // wiki 文章对外阅读页基地址(复制链接/默认浏览器打开用):由 app 层从配置注入,Service 置 null
        String articleBaseUrl) {
}
