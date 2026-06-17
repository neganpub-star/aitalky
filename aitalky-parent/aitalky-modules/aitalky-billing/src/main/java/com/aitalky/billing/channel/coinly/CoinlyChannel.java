package com.aitalky.billing.channel.coinly;

import com.aitalky.billing.channel.PaymentChannel;
import com.aitalky.billing.config.BillingProperties;
import com.aitalky.common.api.ResultCode;
import com.aitalky.common.exception.BizException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;

/**
 * Coinly 自研钱包对接(HTTP)。全 POST + application/json，参数全在 body(含 pid/nonce/timestamp/sign)。
 * <p>不引第三方 jar，用 JDK HttpClient + Jackson。签名见 {@link CoinlySigner}。
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class CoinlyChannel implements PaymentChannel {

    private static final String CHANNEL_KEY = "coinly";

    private final BillingProperties properties;
    private final ObjectMapper objectMapper;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    @Override
    public String channelKey() {
        return CHANNEL_KEY;
    }

    @Override
    public String createAddress(CreateAddressReq req) {
        BillingProperties.Coinly cfg = properties.coinly();
        // 公共参数 + 业务参数(LinkedHashMap 仅为可读，签名内部会重排序)
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("pid", cfg.pid());
        body.put("chain_id", req.chainId());
        body.put("callback_url", req.callbackUrl());
        body.put("alias", req.alias());
        body.put("nonce", nonce());
        body.put("timestamp", System.currentTimeMillis());
        body.put("sign", CoinlySigner.sign(body, cfg.apiKey()));

        // 网关会剥掉一层 /api 前缀再转发后端,后端真实路由是 /api/v1/address/create;
        // base-url 已含尾 /api/,故路径还需再带一层 api/ → 实发 .../api/api/v1/address/create
        // (对齐官方 SDK:url=".../api/" + path="/api/v1/address/create")。
        JsonNode data = post("api/v1/address/create", body);
        JsonNode address = data.path("address");
        if (address.isMissingNode() || address.asText().isBlank()) {
            log.error("Coinly 建址响应无 address 字段, chainId={}, data={}", req.chainId(), data);
            throw new BizException(ResultCode.BILLING_CHANNEL_ERROR);
        }
        return address.asText();
    }

    /** POST 调用并返回 data 节点;非 2xx 或解析失败抛业务异常 */
    private JsonNode post(String path, Map<String, Object> body) {
        String url = properties.coinly().baseUrl() + path;
        try {
            String json = objectMapper.writeValueAsString(body);
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(10))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(json))
                    .build();
            HttpResponse<String> resp = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() < 200 || resp.statusCode() >= 300) {
                log.error("Coinly 调用失败, url={}, status={}, resp={}", url, resp.statusCode(), resp.body());
                throw new BizException(ResultCode.BILLING_CHANNEL_ERROR);
            }
            JsonNode root = objectMapper.readTree(resp.body());
            return root.path("data");
        } catch (BizException e) {
            throw e;
        } catch (Exception e) {
            log.error("Coinly 调用异常, url={}", url, e);
            throw new BizException(ResultCode.BILLING_CHANNEL_ERROR);
        }
    }

    /** 6 位随机 nonce */
    private static String nonce() {
        return String.format("%06d", ThreadLocalRandom.current().nextInt(1_000_000));
    }
}
