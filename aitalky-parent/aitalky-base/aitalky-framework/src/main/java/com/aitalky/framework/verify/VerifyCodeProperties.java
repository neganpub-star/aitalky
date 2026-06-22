package com.aitalky.framework.verify;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 验证码配置(aitalky.verify-code.*)。
 *
 * @param masterEnabled        是否开启「万能验证码」(开发期 true:可直接用 masterCode 通过校验/登录;生产置 false)
 * @param masterCode           万能验证码值
 * @param ttlMinutes           真实验证码有效期(分钟)
 * @param sendIntervalSeconds  同一邮箱+场景的发送最小间隔(秒,防刷)
 * @param codeLength           验证码位数
 * @param from                 发件邮箱(展示用)
 * @param maxAttempts          同一邮箱+场景连续输错的最大次数,达到即临时锁定(防暴力枚举)
 * @param lockMinutes          触发锁定后的锁定时长(分钟)
 */
@ConfigurationProperties(prefix = "aitalky.verify-code")
public record VerifyCodeProperties(
        boolean masterEnabled,
        String masterCode,
        int ttlMinutes,
        int sendIntervalSeconds,
        int codeLength,
        String from,
        int maxAttempts,
        int lockMinutes
) {
    public VerifyCodeProperties {
        if (ttlMinutes <= 0) {
            ttlMinutes = 5;
        }
        if (sendIntervalSeconds <= 0) {
            sendIntervalSeconds = 60;
        }
        if (codeLength <= 0) {
            codeLength = 6;
        }
        if (maxAttempts <= 0) {
            maxAttempts = 5;
        }
        if (lockMinutes <= 0) {
            lockMinutes = 10;
        }
    }
}
