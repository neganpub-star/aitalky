package com.aitalky.identity.dto;

/**
 * 项目基本信息(团队设置 → 基本信息)。
 * @param ownerMemberId 当前负责人对应的成员id(负责人下拉默认选中)
 * @param isOwner       当前登录用户是否为负责人(决定能否改名/换logo/转让/注销)
 */
public record ProjectDetailVO(
        Long id,
        String name,
        String logo,
        String appId,
        Long ownerMemberId,
        boolean isOwner) {
}
