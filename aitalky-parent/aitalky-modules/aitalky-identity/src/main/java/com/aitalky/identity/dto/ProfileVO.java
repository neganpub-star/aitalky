package com.aitalky.identity.dto;

/**
 * 个人中心资料(账户 + 当前项目成员信息聚合)。
 * isOwner=该成员是否为项目负责人(owner 不能退出项目)。
 */
public record ProfileVO(
        String email,
        Long projectId, String projectName, boolean owner,
        Long memberId, String nickname, String avatar, String roleName,
        String language, Integer soundEnabled, Integer pushEnabled) {
}
