package com.aitalky.identity.dto;

import jakarta.validation.constraints.NotNull;

/**
 * 负责人转让(危险操作,负责人专属)。
 * @param projectName 二次确认:需与当前项目名一致
 * @param password    当前负责人登录密码(RSA 密文)
 * @param code        邮箱验证码(发到当前负责人邮箱)
 */
public record TransferOwnerCmd(
        @NotNull Long newOwnerMemberId,
        String projectName,
        String password,
        String code) {
}
