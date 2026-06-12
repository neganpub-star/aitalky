package com.aitalky.identity.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * 接受邀请加入项目(账号级令牌调用)。
 * @param nickname   成员昵称(便于管理员识别)
 * @param accessCode 私密链接的访问验证码(公开链接/邮箱邀请可空)
 */
public record AcceptInviteCmd(
        @NotBlank @Size(max = 40) String nickname,
        String accessCode) {
}
