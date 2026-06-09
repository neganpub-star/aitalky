package com.aitalky.messenger.dto;

/** 快捷回复条目 */
public record QuickReplyVO(Long id, Long categoryId, String title, String content) {
}
