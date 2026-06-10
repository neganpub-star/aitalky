package com.aitalky.framework.captcha;

import lombok.extern.slf4j.Slf4j;
import org.redisson.api.RBucket;
import org.redisson.api.RedissonClient;
import org.redisson.client.codec.StringCodec;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Font;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.security.SecureRandom;
import java.time.Duration;
import java.util.Base64;
import java.util.UUID;

/**
 * 图形验证码服务:生成验证码图片(Java2D,无第三方依赖)→ base64 PNG,答案存 Redis。
 * <p>用于平台后管登录防暴力破解:先 {@link #generate()} 拿 captchaId+图片,登录时带回 captchaId+用户输入,
 * 由 {@link #verify(String, String)} 校验(一次性,校验即失效;大小写不敏感)。
 */
@Slf4j
@Service
public class CaptchaService {

    /** 验证码字符集(去掉易混淆的 0/O/1/I/L) */
    private static final char[] POOL = "23456789ABCDEFGHJKMNPQRSTUVWXYZ".toCharArray();
    private static final int CODE_LEN = 4;
    private static final int WIDTH = 120;
    private static final int HEIGHT = 40;
    private static final Duration TTL = Duration.ofMinutes(2);
    private static final SecureRandom RANDOM = new SecureRandom();

    private final RedissonClient redisson;

    public CaptchaService(RedissonClient redisson) {
        this.redisson = redisson;
    }

    /** 生成验证码,返回 captchaId + base64 PNG(形如 data:image/png;base64,xxx) */
    public Captcha generate() {
        String code = randomCode();
        String captchaId = UUID.randomUUID().toString().replace("-", "");
        // 答案存 Redis(统一大写,大小写不敏感);StringCodec 纯文本存储,便于排查/互操作
        redisson.getBucket(redisKey(captchaId), StringCodec.INSTANCE).set(code.toUpperCase(), TTL);
        String image = "data:image/png;base64," + render(code);
        return new Captcha(captchaId, image);
    }

    /** 校验验证码:命中即删除(一次性);失败返回 false。captchaId/输入任一为空直接 false。 */
    public boolean verify(String captchaId, String input) {
        if (captchaId == null || captchaId.isBlank() || input == null || input.isBlank()) {
            return false;
        }
        RBucket<String> bucket = redisson.getBucket(redisKey(captchaId), StringCodec.INSTANCE);
        String real = bucket.get();
        if (real == null) {
            return false;
        }
        bucket.delete(); // 一次性:无论对错都失效,防重放/穷举
        return input.trim().equalsIgnoreCase(real);
    }

    private String randomCode() {
        StringBuilder sb = new StringBuilder(CODE_LEN);
        for (int i = 0; i < CODE_LEN; i++) {
            sb.append(POOL[RANDOM.nextInt(POOL.length)]);
        }
        return sb.toString();
    }

    /** 把验证码画成图片并编码为 base64(不含前缀) */
    private String render(String code) {
        BufferedImage img = new BufferedImage(WIDTH, HEIGHT, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = img.createGraphics();
        try {
            g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            // 背景
            g.setColor(new Color(245, 246, 250));
            g.fillRect(0, 0, WIDTH, HEIGHT);
            // 干扰线
            for (int i = 0; i < 5; i++) {
                g.setColor(randomColor(150, 200));
                g.drawLine(RANDOM.nextInt(WIDTH), RANDOM.nextInt(HEIGHT),
                        RANDOM.nextInt(WIDTH), RANDOM.nextInt(HEIGHT));
            }
            // 字符(逐个随机颜色+轻微旋转)
            Font font = new Font("Arial", Font.BOLD, 28);
            g.setFont(font);
            int x = 12;
            for (char c : code.toCharArray()) {
                g.setColor(randomColor(20, 130));
                double theta = (RANDOM.nextDouble() - 0.5) * 0.5;
                g.rotate(theta, x, HEIGHT / 2.0);
                g.drawString(String.valueOf(c), x, 30);
                g.rotate(-theta, x, HEIGHT / 2.0);
                x += 26;
            }
            // 干扰点
            for (int i = 0; i < 30; i++) {
                img.setRGB(RANDOM.nextInt(WIDTH), RANDOM.nextInt(HEIGHT), randomColor(0, 255).getRGB());
            }
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            ImageIO.write(img, "png", out);
            return Base64.getEncoder().encodeToString(out.toByteArray());
        } catch (IOException e) {
            // 图片渲染失败极罕见;抛运行时由全局异常兜底
            throw new IllegalStateException("captcha render failed", e);
        } finally {
            g.dispose();
        }
    }

    private Color randomColor(int min, int max) {
        int r = min + RANDOM.nextInt(max - min);
        int gr = min + RANDOM.nextInt(max - min);
        int b = min + RANDOM.nextInt(max - min);
        return new Color(Math.min(r, 255), Math.min(gr, 255), Math.min(b, 255));
    }

    private String redisKey(String captchaId) {
        return "captcha:img:" + captchaId;
    }

    /** 生成结果:captchaId 提交时回传,image 为 data URI 供 <img src> 直接渲染 */
    public record Captcha(String captchaId, String image) {
    }
}
