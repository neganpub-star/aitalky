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
}
