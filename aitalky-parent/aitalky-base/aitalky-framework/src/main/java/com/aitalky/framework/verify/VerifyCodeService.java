package com.aitalky.framework.verify;

import com.aitalky.common.api.ResultCode;
import com.aitalky.common.exception.BizException;
import lombok.extern.slf4j.Slf4j;
import org.redisson.api.RBucket;
import org.redisson.api.RedissonClient;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Duration;
import java.util.concurrent.TimeUnit;

/**
 * 验证码服务:发送(存 Redis + 邮件) / 校验。
 * <p><b>万能验证码</b>:{@code master-enabled=true} 时,提交的 code 等于 master-code 直接通过——
 * 开发期可不发真实邮件、直接用万能码注册/登录;生产置 false 后只认真实邮件码。
 */
@Slf4j
@Service
public class VerifyCodeService {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final RedissonClient redisson;
    private final VerifyCodeProperties props;
    /** 邮件发送器(可能不存在,如 ws 入口未配 spring.mail) */
    private final ObjectProvider<JavaMailSender> mailSenderProvider;

    public VerifyCodeService(RedissonClient redisson, VerifyCodeProperties props,
                             ObjectProvider<JavaMailSender> mailSenderProvider) {
        this.redisson = redisson;
        this.props = props;
        this.mailSenderProvider = mailSenderProvider;
    }

    /** 发送验证码到邮箱(带防刷间隔) */
    public void sendCode(VerifyScene scene, String email) {
        // 开启万能码(开发期):不生成真实码、不发邮件,直接用万能码通过校验即可
        if (props.masterEnabled()) {
            log.info("【验证码·DEV】已开启万能码,跳过真实发信。scene={}, email={}, 用万能码 {} 即可", scene, email, props.masterCode());
            return;
        }
        // 防刷:同邮箱+场景在间隔内只能发一次
        RBucket<String> limit = redisson.getBucket(limitKey(scene, email));
        if (!limit.setIfAbsent("1", Duration.ofSeconds(props.sendIntervalSeconds()))) {
            throw new BizException(ResultCode.VERIFY_CODE_TOO_FREQUENT);
        }
        String code = randomCode(props.codeLength());
        redisson.getBucket(codeKey(scene, email)).set(code, props.ttlMinutes(), TimeUnit.MINUTES);
        sendMail(email, scene, code);
    }

    /**
     * 校验验证码:万能码优先;否则比对 Redis 中的真实码(一次性,校验通过即失效)。
     * 校验失败抛 {@link BizException}。
     */
    public void verify(VerifyScene scene, String email, String code) {
        if (code == null || code.isBlank()) {
            throw new BizException(ResultCode.VERIFY_CODE_ERROR);
        }
        if (props.masterEnabled() && code.equals(props.masterCode())) {
            return; // 万能码直接通过
        }
        RBucket<String> bucket = redisson.getBucket(codeKey(scene, email));
        String real = bucket.get();
        if (real == null || !real.equals(code)) {
            throw new BizException(ResultCode.VERIFY_CODE_ERROR);
        }
        bucket.delete(); // 一次性使用
    }

    private void sendMail(String email, VerifyScene scene, String code) {
        JavaMailSender sender = mailSenderProvider.getIfAvailable();
        if (sender == null) {
            log.warn("未配置邮件发送器,跳过发信(email={})", email);
            return;
        }
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setFrom(props.from());
            msg.setTo(email);
            msg.setSubject("【aitalky】验证码");
            msg.setText("您的验证码是 " + code + ",有效期 " + props.ttlMinutes() + " 分钟,请勿泄露。");
            sender.send(msg);
        } catch (Exception e) {
            // 发信失败不阻断主流程(开发期可用万能码);仅告警
            log.warn("验证码邮件发送失败 email={}, 原因={}", email, e.getMessage());
        }
    }

    private String randomCode(int len) {
        StringBuilder sb = new StringBuilder(len);
        for (int i = 0; i < len; i++) {
            sb.append(RANDOM.nextInt(10));
        }
        return sb.toString();
    }

    private String codeKey(VerifyScene scene, String email) {
        return "verify:code:" + scene.name().toLowerCase() + ":" + email;
    }

    private String limitKey(VerifyScene scene, String email) {
        return "verify:limit:" + scene.name().toLowerCase() + ":" + email;
    }
}
