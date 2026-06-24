package com.aitalky.framework.translate;

import com.aitalky.common.api.ResultCode;
import com.aitalky.common.exception.BizException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Map;

/**
 * 阿里云机翻网关引擎(复用 cicada 自建网关):POST {text,targetLanguage} → {translatedText,sourceLanguage,wordCount}。
 * 源语言自动检测(网关 /auto)。targetLanguage 用阿里云码,由 aitalky 标准码映射而来。
 */
@Slf4j
@Component
public class AliGatewayProvider implements TranslateProvider {

    /** aitalky 标准语言码 → 阿里云机翻语言码;未命中按 '_' 前段兜底(zh_CN→zh) */
    private static final Map<String, String> LANG = Map.of(
            "zh_CN", "zh", "zh_TW", "zh-tw", "en_US", "en", "en", "en",
            "ja_JP", "ja", "ko_KR", "ko", "fr_FR", "fr", "de_DE", "de", "es_ES", "es");

    private final TranslateProperties props;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient http;

    public AliGatewayProvider(TranslateProperties props) {
        this.props = props;
        this.http = HttpClient.newBuilder().connectTimeout(Duration.ofMillis(props.timeoutMs())).build();
    }

    @Override
    public String key() {
        return "ali-gateway";
    }

    @Override
    public TranslateResult translate(String text, String targetLang) {
        try {
            String body = objectMapper.writeValueAsString(Map.of("text", text, "targetLanguage", aliCode(targetLang)));
            HttpRequest req = HttpRequest.newBuilder(URI.create(props.aliGatewayUrl()))
                    .timeout(Duration.ofMillis(props.timeoutMs()))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8))
                    .build();
            HttpResponse<String> resp = http.send(req, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (resp.statusCode() != 200) {
                log.warn("翻译网关非200 status={}, body={}", resp.statusCode(), resp.body());
                throw new BizException(ResultCode.SYSTEM_ERROR);
            }
            JsonNode node = objectMapper.readTree(resp.body());
            if (!node.path("success").asBoolean(false)) {
                log.warn("翻译网关返回失败: {}", node.path("errorMessage").asText(null));
                throw new BizException(ResultCode.SYSTEM_ERROR);
            }
            String translated = node.path("translatedText").asText(null);
            String srcLang = node.path("sourceLanguage").asText(null);
            // wordCount 网关返回字符串(源文本字符数);缺省回退按原文长度计
            int chars = parseCount(node.path("wordCount").asText(null), text);
            return new TranslateResult(translated, srcLang, chars);
        } catch (BizException e) {
            throw e;
        } catch (Exception e) {
            log.warn("翻译网关调用异常: {}", e.getMessage());
            throw new BizException(ResultCode.SYSTEM_ERROR);
        }
    }

    /** aitalky 标准码 → 阿里云码;未配置则取 '_' 前段(如 zh_CN→zh),仍空则原样 */
    private String aliCode(String lang) {
        if (!StringUtils.hasText(lang)) {
            return "en";
        }
        String hit = LANG.get(lang);
        if (hit != null) {
            return hit;
        }
        int us = lang.indexOf('_');
        return us > 0 ? lang.substring(0, us).toLowerCase() : lang.toLowerCase();
    }

    private int parseCount(String wordCount, String text) {
        if (StringUtils.hasText(wordCount)) {
            try {
                return Integer.parseInt(wordCount.trim());
            } catch (NumberFormatException ignore) {
                // 落到按原文长度兜底
            }
        }
        return text == null ? 0 : text.length();
    }
}
