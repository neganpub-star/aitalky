package com.aitalky.identity.dto;

import java.time.LocalDateTime;

/**
 * 平台后管 - 用户(账号)列表项。
 * <p>平台运营可见完整邮箱(用于识别用户);密码哈希等敏感字段绝不出参。
 */
public record AdminAccountVO(
        Long id,
        String email,
        String username,
        String inviteCode,
        Integer status,
        Integer projectCount,
        LocalDateTime createTime
) {
}
