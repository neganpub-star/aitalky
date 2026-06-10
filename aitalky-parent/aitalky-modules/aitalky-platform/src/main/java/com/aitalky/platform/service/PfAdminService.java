package com.aitalky.platform.service;

import com.aitalky.platform.dto.AdminLoginCmd;
import com.aitalky.platform.dto.AdminLoginResult;
import com.aitalky.platform.dto.AdminProfileVO;

/**
 * 平台管理员服务:登录(用户名+密码+图形验证码)、当前资料。
 */
public interface PfAdminService {

    /** 登录:校验验证码 → 校验密码 → 签发平台级令牌(scope=platform,functions=平台权限) */
    AdminLoginResult login(AdminLoginCmd cmd);

    /** 查询当前登录管理员资料 */
    AdminProfileVO profile(Long adminId);
}
