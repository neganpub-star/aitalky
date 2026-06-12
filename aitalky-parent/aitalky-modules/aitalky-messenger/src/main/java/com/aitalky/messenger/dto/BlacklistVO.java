package com.aitalky.messenger.dto;

import java.time.LocalDateTime;

/**
 * 黑名单列表项(对齐参考系统列)。
 * uid/mid 由 targetType+targetValue 派生:用户态(type=1)→uid=值;游客态(type=2)→mid=值。
 * customerName/contact/email/location/operatorName 为拉黑时快照。
 */
public record BlacklistVO(
        Long id, Integer targetType, String targetValue,
        String uid, String mid,
        String customerName, String contact, String email, String location,
        String operatorName, String reason, LocalDateTime createTime) {
}
