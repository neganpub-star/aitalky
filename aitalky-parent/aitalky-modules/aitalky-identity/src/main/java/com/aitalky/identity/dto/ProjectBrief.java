package com.aitalky.identity.dto;

/** 项目简要信息(登录后列出账号可进入的项目);logo 供图标栏/切换列表展示 */
public record ProjectBrief(Long id, String name, String appId, String logo) {
}
