package com.aitalky.billing.channel;

import com.aitalky.common.api.ResultCode;
import com.aitalky.common.exception.BizException;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 支付渠道注册表:按 channelKey 索引所有 {@link PaymentChannel} 实现。
 * <p>上层按配置(aitalky.billing.channel)取当前渠道，加渠道只需新增实现 bean。
 */
@Component
public class PaymentChannelRegistry {

    private final Map<String, PaymentChannel> channels;

    public PaymentChannelRegistry(List<PaymentChannel> channelList) {
        this.channels = channelList.stream()
                .collect(Collectors.toMap(PaymentChannel::channelKey, Function.identity()));
    }

    /** 取指定渠道，不存在抛业务异常 */
    public PaymentChannel get(String channelKey) {
        PaymentChannel channel = channels.get(channelKey);
        if (channel == null) {
            throw new BizException(ResultCode.BILLING_CHANNEL_ERROR);
        }
        return channel;
    }
}
