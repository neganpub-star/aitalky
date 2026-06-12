package com.aitalky.conversation.dto;

/**
 * 收件箱各视图统计。mine/unassigned/all/mention=进行中会话数(分类徽标);
 * mineUnread/unassignedUnread="该我处理"的未读会话数(>0 即对应分类亮红点,跨视图也准);
 * 别人负责的会话不计入未读(可在「全部」看到但不给我亮红点)。mention 暂为 0。
 */
public record ConversationCounts(long mine, long unassigned, long all, long mention,
                                 long mineUnread, long unassignedUnread) {
}
