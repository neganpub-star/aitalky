package com.aitalky.identity.dto;

/** 信使端展示用的坐席信息(昵称/头像/是否在线工作)。online=work_status==1 */
public record MemberAgent(String nickname, String avatar, boolean online) {
}
