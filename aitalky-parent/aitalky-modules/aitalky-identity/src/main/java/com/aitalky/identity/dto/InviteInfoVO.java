package com.aitalky.identity.dto;

/**
 * 邀请落地页信息(公开接口,凭 token 查;无需登录)。
 * @param type     email / link
 * @param email    邮箱邀请的受邀邮箱(链接邀请为 null)
 * @param needCode 私密链接需输入验证码
 * @param valid    邀请是否有效;false 时 reason 给出原因
 */
public record InviteInfoVO(
        String type,
        Long projectId,
        String projectName,
        String projectLogo,
        String roleName,
        String email,
        String inviterName,
        boolean needCode,
        boolean valid,
        String reason) {
}
