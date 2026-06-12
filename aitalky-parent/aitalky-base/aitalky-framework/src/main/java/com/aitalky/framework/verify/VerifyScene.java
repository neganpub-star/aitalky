package com.aitalky.framework.verify;

/** 验证码使用场景(用于区分 Redis key 与邮件文案) */
public enum VerifyScene {
    /** 注册 */
    REGISTER,
    /** 登录(2FA) */
    LOGIN,
    /** 重置密码 */
    RESET_PWD,
    /** 负责人危险操作(转让/注销项目)二次校验 */
    SENSITIVE
}
