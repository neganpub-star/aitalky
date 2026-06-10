package com.aitalky.messenger.dto;

/**
 * 信使端公开配置(init 带出):仅暴露展示所需的公开字段 + 当前语言的问候语/团队介绍/紧急通知。
 * <p>不含弹窗/保存天数等后管配置,也不暴露其它语言内容。
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
        boolean urgentEnabled) {
}
