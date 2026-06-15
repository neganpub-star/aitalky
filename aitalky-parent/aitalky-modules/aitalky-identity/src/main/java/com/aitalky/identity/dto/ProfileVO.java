package com.aitalky.identity.dto;

/**
 * 个人中心资料(账户 + 当前项目成员信息聚合)。
 * isOwner=该成员是否为项目负责人(owner 不能退出项目)。
 */
public record ProfileVO(
        String email, String username, String inviteCode,
        Long projectId, String projectName, boolean owner,
        Long memberId, String nickname, String avatar, String roleName,
        String language, Integer soundEnabled, Integer pushEnabled,
        // workStatus=工作状态(1在线 0离开),供头像菜单开关回显
        Integer workStatus) {
}
