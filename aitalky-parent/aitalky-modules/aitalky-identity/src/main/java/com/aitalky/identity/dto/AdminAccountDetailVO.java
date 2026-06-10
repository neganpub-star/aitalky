package com.aitalky.identity.dto;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 平台后管 - 用户(账号)详情:账号信息 + 其加入的项目(成员身份)。
 */
public record AdminAccountDetailVO(
        Long id,
        String email,
        String username,
        String inviteCode,
        Long inviterAccountId,
        Integer status,
        LocalDateTime createTime,
        List<JoinedProject> projects
) {
    /** 账号在某项目内的成员身份 */
    public record JoinedProject(
            Long projectId,
            String projectName,
            String nickname,
            Long roleId,
            String roleName,
            Integer memberStatus
    ) {
    }
}
