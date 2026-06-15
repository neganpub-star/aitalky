package com.aitalky.identity.service;

import com.aitalky.framework.verify.VerifyScene;
import com.aitalky.identity.dto.LoginCmd;
import com.aitalky.identity.dto.LoginResult;
import com.aitalky.identity.dto.RegisterCmd;

/** 账号服务:发码 / 注册 / 登录 */
public interface AccountService {

    /** 发送邮箱验证码(注册/登录/重置密码) */
    void sendCode(VerifyScene scene, String email);

    /**
     * 注册账号(校验邮箱验证码 + 邮箱+密码)。
     *
     * @return 新账号 id
     */
    Long register(RegisterCmd cmd);

    /**
     * 登录:密码 + 邮箱验证码(2FA),签发「账号级」令牌,返回可进入的项目列表。
     */
    LoginResult login(LoginCmd cmd);

    /** 修改用户名(账号显示名;校验非空/长度) */
    void updateUsername(Long accountId, String username);

    /** 更改邮箱(校验新邮箱未被占用 + 发往新邮箱的验证码) */
    void changeEmail(Long accountId, String newEmail, String code);

    /** 更改密码(记得旧密码:校验旧密码密文后更新;入参均为 RSA 密文) */
    void changePassword(Long accountId, String oldPasswordCipher, String newPasswordCipher);

    /** 重置密码(忘记旧密码:校验发往本账号邮箱的验证码后更新;新密码为 RSA 密文) */
    void resetPassword(Long accountId, String code, String newPasswordCipher);

    /** 当前账号加入的项目列表(切换项目用;加入新项目后刷新)。绕租户跨项目查 */
    java.util.List<com.aitalky.identity.dto.ProjectBrief> myProjects(Long accountId);
}
