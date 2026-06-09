package com.aitalky.conversation.dto;

/** 收件箱各视图进行中会话数(分类徽标用);mention 暂为 0(依赖 Mongo @提及,后续实现) */
public record ConversationCounts(long mine, long unassigned, long all, long mention) {
}
