package com.aitalky.identity.dto;

/** 成员列表项(展示用,email 已脱敏;Long 由 Jackson 统一序列化为字符串) */
public record MemberVO(
        Long id,
        Long accountId,
        String email,
        String nickname,
        String avatar,
        Long roleId,
        String roleName,
        Integer status,
        Integer onlineStatus,
        Integer workStatus
) {
}
