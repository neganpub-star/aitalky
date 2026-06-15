package com.aitalky.identity.dto;

/**
 * 当前账号的「待加入」邮箱邀请(切换项目下拉展示)。
 * 点击凭 token 直接 accept 加入,无需走邮件链接。
 */
public record PendingInviteVO(
        String token,
        Long projectId,
        String projectName,
        String projectLogo,
        String roleName,
        String inviterName) {
}
