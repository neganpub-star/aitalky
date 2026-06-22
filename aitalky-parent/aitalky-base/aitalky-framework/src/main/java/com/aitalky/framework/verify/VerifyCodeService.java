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
     * <p><b>防暴力枚举</b>:同一邮箱+场景连续输错达 {@code maxAttempts} 次即临时锁定 {@code lockMinutes} 分钟,
     * 锁定期间一律返回 {@link ResultCode#VERIFY_CODE_LOCKED};校验通过则清零失败计数。
     * 校验失败抛 {@link BizException}。
     */
    public void verify(VerifyScene scene, String email, String code) {
        // 锁定优先:被锁期间不消耗也不比对,直接拒绝(避免锁后仍可继续枚举)
        if (redisson.getBucket(lockKey(scene, email)).isExists()) {
            throw new BizException(ResultCode.VERIFY_CODE_LOCKED);
        }
        if (code == null || code.isBlank()) {
            throw new BizException(ResultCode.VERIFY_CODE_ERROR);
        }
        if (props.masterEnabled() && code.equals(props.masterCode())) {
            return; // 万能码直接通过(不计入失败次数)
        }
        RBucket<String> bucket = redisson.getBucket(codeKey(scene, email));
        String real = bucket.get();
        if (real == null || !real.equals(code)) {
            recordFailureAndMaybeLock(scene, email);
            throw new BizException(ResultCode.VERIFY_CODE_ERROR);
        }
        bucket.delete();                              // 一次性使用
        redisson.getBucket(failKey(scene, email)).delete(); // 校验通过清零失败计数
    }

    /**
     * 记一次校验失败:失败计数 +1(计数窗口 = 锁定时长);达到上限则置锁定标记并清掉真实码,
     * 后续即便有真实码也被锁定拦截,杜绝继续枚举。
     */
    private void recordFailureAndMaybeLock(VerifyScene scene, String email) {
        var counter = redisson.getAtomicLong(failKey(scene, email));
        long fails = counter.incrementAndGet();
        if (fails == 1L) {
            // 首次失败才设置过期,使计数窗口与锁定时长一致(避免每次失败都续期导致永不重置)
            counter.expire(Duration.ofMinutes(props.lockMinutes()));
        }
        if (fails >= props.maxAttempts()) {
            redisson.getBucket(lockKey(scene, email)).set("1", props.lockMinutes(), TimeUnit.MINUTES);
            redisson.getBucket(codeKey(scene, email)).delete(); // 锁定即作废当前真实码
            counter.delete();
            log.warn("验证码连续输错达上限已锁定 scene={}, email={}, lockMinutes={}", scene, email, props.lockMinutes());
            throw new BizException(ResultCode.VERIFY_CODE_LOCKED);
        }
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

    /** 失败计数 key(连续输错次数) */
    private String failKey(VerifyScene scene, String email) {
        return "verify:fail:" + scene.name().toLowerCase() + ":" + email;
    }

    /** 锁定标记 key(存在即处于锁定期) */
    private String lockKey(VerifyScene scene, String email) {
        return "verify:lock:" + scene.name().toLowerCase() + ":" + email;
    }
}
