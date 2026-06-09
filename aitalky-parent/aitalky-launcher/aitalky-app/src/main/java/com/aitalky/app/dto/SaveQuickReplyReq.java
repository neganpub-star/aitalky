package com.aitalky.app.dto;

/** 新增/更新快捷回复条目 */
public record SaveQuickReplyReq(Long categoryId, String title, String content) {
}
